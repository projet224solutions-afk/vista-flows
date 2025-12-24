import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/pubsub",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signatureInput}.${signatureEncoded}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    let projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    let serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');

    // Check if variables are swapped (projectId contains JSON)
    if (projectId && projectId.includes('{') && projectId.includes('project_id')) {
      console.log("⚠️ Detected swapped env variables, correcting...");
      serviceAccountJson = projectId;
      try {
        const parsed = JSON.parse(projectId);
        projectId = parsed.project_id;
      } catch {
        projectId = undefined;
      }
    }

    // Test 1: Configuration check
    results.tests.push({
      name: "Configuration",
      status: projectId && serviceAccountJson ? "✅ OK" : "❌ FAILED",
      details: {
        hasProjectId: !!projectId,
        hasServiceAccount: !!serviceAccountJson,
        projectId: projectId || "NOT SET"
      }
    });

    if (!projectId || !serviceAccountJson) {
      results.success = false;
      results.message = "Configuration manquante";
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 2: Service Account parsing
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
      results.tests.push({
        name: "Service Account Parsing",
        status: "✅ OK",
        details: {
          clientEmail: serviceAccount.client_email,
          projectId: serviceAccount.project_id
        }
      });
    } catch (e) {
      results.tests.push({
        name: "Service Account Parsing",
        status: "❌ FAILED",
        error: e instanceof Error ? e.message : "Parse error"
      });
      results.success = false;
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 3: OAuth Token
    let accessToken;
    try {
      console.log("🔐 Getting OAuth token...");
      accessToken = await getAccessToken(serviceAccount);
      results.tests.push({
        name: "OAuth Token",
        status: "✅ OK",
        details: {
          tokenLength: accessToken.length,
          tokenPrefix: accessToken.substring(0, 20) + "..."
        }
      });
    } catch (e) {
      results.tests.push({
        name: "OAuth Token",
        status: "❌ FAILED",
        error: e instanceof Error ? e.message : "Token error"
      });
      results.success = false;
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 4: List Topics (API connectivity test)
    try {
      console.log("📋 Listing Pub/Sub topics...");
      const listUrl = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics`;
      const listResponse = await fetch(listUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (listResponse.ok) {
        const topicsData = await listResponse.json();
        const topics = (topicsData.topics || []).map((t: any) => t.name?.split('/').pop());
        results.tests.push({
          name: "List Topics (API Connection)",
          status: "✅ OK",
          details: {
            topicsCount: topics.length,
            topics: topics.slice(0, 5)
          }
        });
      } else {
        const errorText = await listResponse.text();
        results.tests.push({
          name: "List Topics (API Connection)",
          status: "⚠️ WARNING",
          details: {
            statusCode: listResponse.status,
            error: errorText
          }
        });
      }
    } catch (e) {
      results.tests.push({
        name: "List Topics (API Connection)",
        status: "❌ FAILED",
        error: e instanceof Error ? e.message : "API error"
      });
    }

    // Test 5: Create Test Topic
    const testTopicName = "224solutions-test-topic";
    try {
      console.log(`📌 Creating test topic: ${testTopicName}...`);
      const createUrl = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${testTopicName}`;
      const createResponse = await fetch(createUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (createResponse.ok || createResponse.status === 409) {
        results.tests.push({
          name: "Create Topic",
          status: "✅ OK",
          details: {
            topicName: testTopicName,
            alreadyExists: createResponse.status === 409
          }
        });
      } else {
        const errorText = await createResponse.text();
        results.tests.push({
          name: "Create Topic",
          status: "❌ FAILED",
          details: {
            statusCode: createResponse.status,
            error: errorText
          }
        });
      }
    } catch (e) {
      results.tests.push({
        name: "Create Topic",
        status: "❌ FAILED",
        error: e instanceof Error ? e.message : "Create error"
      });
    }

    // Test 6: Publish Message
    try {
      console.log("📤 Publishing test message...");
      const publishUrl = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${testTopicName}:publish`;
      const testMessage = {
        source: "224solutions-pubsub-test",
        timestamp: new Date().toISOString(),
        data: { test: true, message: "Hello from 224Solutions!" }
      };

      const publishResponse = await fetch(publishUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{
            data: btoa(JSON.stringify(testMessage)),
            attributes: { source: "test", environment: "production" }
          }]
        })
      });

      if (publishResponse.ok) {
        const publishResult = await publishResponse.json();
        results.tests.push({
          name: "Publish Message",
          status: "✅ OK",
          details: {
            messageId: publishResult.messageIds?.[0],
            topic: testTopicName
          }
        });
      } else {
        const errorText = await publishResponse.text();
        results.tests.push({
          name: "Publish Message",
          status: "❌ FAILED",
          details: {
            statusCode: publishResponse.status,
            error: errorText
          }
        });
      }
    } catch (e) {
      results.tests.push({
        name: "Publish Message",
        status: "❌ FAILED",
        error: e instanceof Error ? e.message : "Publish error"
      });
    }

    // Summary
    const passedTests = results.tests.filter((t: any) => t.status.includes("✅")).length;
    const totalTests = results.tests.length;
    results.success = passedTests === totalTests;
    results.summary = `${passedTests}/${totalTests} tests passed`;
    results.message = results.success 
      ? "🎉 Google Cloud Pub/Sub est opérationnel!" 
      : "⚠️ Certains tests ont échoué";

    console.log(`✅ Test completed: ${results.summary}`);

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Test error:", error);
    results.success = false;
    results.error = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
