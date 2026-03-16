import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// AWS Signature V4 helpers
async function sha256(message: string): Promise<ArrayBuffer> {
  return await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

async function cognitoRequest(target: string, payload: Record<string, unknown>, region: string, accessKey: string, secretKey: string) {
  const host = `cognito-idp.${region}.amazonaws.com`;
  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const service = 'cognito-idp';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
  };

  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders.map(k => `${k.toLowerCase()}:${headers[k]}\n`).join('');
  const signedHeaders = sortedHeaders.map(k => k.toLowerCase()).join(';');
  const payloadHash = toHex(await sha256(body));
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${toHex(await sha256(canonicalRequest))}`;
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}`, { method: 'POST', headers, body });
  const responseBody = await response.json();
  if (!response.ok) throw new Error(responseBody.__type + ': ' + responseBody.message);
  return responseBody;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const region = Deno.env.get('AWS_COGNITO_REGION') || 'eu-central-1';
    const userPoolId = Deno.env.get('AWS_COGNITO_USER_POOL_ID') || '';
    const clientId = Deno.env.get('AWS_COGNITO_CLIENT_ID') || '';
    const accessKey = Deno.env.get('AWS_ACCESS_KEY_ID') || '';
    const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY') || '';

    const results: Record<string, unknown> = {};

    // ========== TEST 1: Configuration check ==========
    results.config = {
      region,
      userPoolId: userPoolId ? `${userPoolId.slice(0, 15)}...` : 'MISSING',
      clientId: clientId ? `${clientId.slice(0, 8)}...` : 'MISSING',
      accessKey: accessKey ? `${accessKey.slice(0, 8)}...` : 'MISSING',
      status: userPoolId && clientId && accessKey && secretKey ? '✅ OK' : '❌ MISSING',
    };

    // ========== TEST 2: JWKS endpoint accessibility ==========
    try {
      const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
      const jwksResp = await fetch(jwksUrl);
      const jwksData = await jwksResp.json();
      results.jwks = {
        url: jwksUrl,
        status: jwksResp.ok ? '✅ Accessible' : '❌ Inaccessible',
        keysCount: jwksData.keys?.length || 0,
        algorithms: jwksData.keys?.map((k: any) => k.alg) || [],
      };
    } catch (e) {
      results.jwks = { status: '❌ Error', error: e.message };
    }

    // ========== TEST 3: List users (tests IAM permissions) ==========
    try {
      const listResult = await cognitoRequest(
        'AWSCognitoIdentityProviderService.ListUsers',
        { UserPoolId: userPoolId, Limit: 5 },
        region, accessKey, secretKey
      );
      results.listUsers = {
        status: '✅ IAM permissions OK',
        userCount: listResult.Users?.length || 0,
        sampleEmails: listResult.Users?.slice(0, 3).map((u: any) => 
          u.Attributes?.find((a: any) => a.Name === 'email')?.Value || u.Username
        ),
      };
    } catch (e) {
      results.listUsers = { status: '❌ IAM Error', error: e.message };
    }

    // ========== TEST 4: Describe User Pool ==========
    try {
      const poolResult = await cognitoRequest(
        'AWSCognitoIdentityProviderService.DescribeUserPool',
        { UserPoolId: userPoolId },
        region, accessKey, secretKey
      );
      const pool = poolResult.UserPool;
      results.userPool = {
        status: '✅ Pool accessible',
        name: pool?.Name,
        estimatedUsers: pool?.EstimatedNumberOfUsers,
        mfaConfig: pool?.MfaConfiguration,
        passwordPolicy: pool?.Policies?.PasswordPolicy,
        customAttributes: pool?.SchemaAttributes
          ?.filter((a: any) => a.Name?.startsWith('custom:'))
          ?.map((a: any) => a.Name),
      };
    } catch (e) {
      results.userPool = { status: '❌ Error', error: e.message };
    }

    // ========== TEST 5: Describe App Client ==========
    try {
      const clientResult = await cognitoRequest(
        'AWSCognitoIdentityProviderService.DescribeUserPoolClient',
        { UserPoolId: userPoolId, ClientId: clientId },
        region, accessKey, secretKey
      );
      const client = clientResult.UserPoolClient;
      results.appClient = {
        status: '✅ Client accessible',
        clientName: client?.ClientName,
        authFlows: client?.ExplicitAuthFlows,
        tokenValidity: {
          access: client?.AccessTokenValidity,
          id: client?.IdTokenValidity,
          refresh: client?.RefreshTokenValidity,
        },
      };
    } catch (e) {
      results.appClient = { status: '❌ Error', error: e.message };
    }

    // ========== TEST 6: Test InitiateAuth (sign-in flow check) ==========
    // We test with a dummy user to verify the auth flow is configured correctly
    try {
      await cognitoRequest(
        'AWSCognitoIdentityProviderService.AdminInitiateAuth',
        {
          UserPoolId: userPoolId,
          ClientId: clientId,
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: 'test-nonexistent@224solutions.test',
            PASSWORD: 'TestDummy123!',
          },
        },
        region, accessKey, secretKey
      );
      results.authFlow = { status: '✅ Auth flow works' };
    } catch (e) {
      const errMsg = e.message || '';
      if (errMsg.includes('UserNotFoundException') || errMsg.includes('NotAuthorizedException')) {
        results.authFlow = {
          status: '✅ Auth flow configured correctly',
          note: 'Expected error for non-existent test user',
        };
      } else if (errMsg.includes('InvalidParameterException') || errMsg.includes('ADMIN_USER_PASSWORD_AUTH')) {
        results.authFlow = {
          status: '⚠️ ADMIN_USER_PASSWORD_AUTH not enabled',
          fix: 'Enable ALLOW_ADMIN_USER_PASSWORD_AUTH in App Client settings',
          error: errMsg,
        };
      } else {
        results.authFlow = { status: '❌ Error', error: errMsg };
      }
    }

    // ========== SUMMARY ==========
    const allOk = Object.values(results).every((r: any) => 
      typeof r === 'object' && r.status && r.status.startsWith('✅')
    );

    return new Response(JSON.stringify({
      success: true,
      overallStatus: allOk ? '✅ ALL TESTS PASSED' : '⚠️ SOME ISSUES FOUND',
      timestamp: new Date().toISOString(),
      tests: results,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
