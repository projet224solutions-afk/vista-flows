export const AFRICAN_BANK_SOURCE_URLS: string[] = [
  'https://www.bcrg-guinee.org',
  'https://www.bceao.int',
  'https://www.beac.int',
  'https://www.bankofalgeria.dz',
  'https://www.bankofbotswana.bw',
  'https://www.banquecentrale.bi',
  'https://www.bankofcapeverde.cv',
  'https://www.beac.int/en',
  'https://www.bcc.cd',
  'https://www.bceao.int/en',
  'https://www.banque-centrale.mg',
  'https://www.banquecentraledjibouti.dj',
  'https://www.cbe.org.eg',
  'https://www.nbe.gov.et',
  'https://www.bdeac.org',
  'https://www.bog.gov.gh',
  'https://www.bsl.gov.gm',
  'https://www.bstp.st',
  'https://www.bankofuganda.co.ug',
  'https://www.centralbank.go.ke',
  'https://www.banquecentrale.tg',
  'https://www.bct.gov.tn',
  'https://www.bis.org/country/za.htm',
  'https://www.sarb.co.za',
  'https://www.resbank.co.za',
  'https://www.bankofzambia.co.zm',
  'https://www.rbz.co.zw',
  'https://www.cbn.gov.ng',
  'https://www.bou.or.ug',
  'https://www.bot.or.tz',
  'https://www.bnr.rw',
  'https://www.bcm.mg',
  'https://www.banquecentrale.ml',
  'https://www.banquecentrale.ne',
  'https://www.banquecentrale.sn',
  'https://www.banquecentrale.ci',
  'https://www.banquecentrale.cm',
  'https://www.banquecentrale.ga',
  'https://www.banquecentrale.cg',
  'https://www.banquecentrale.cf',
  'https://www.banquecentrale.td',
  'https://www.bankofmauritius.com',
  'https://www.bankofnamibia.com.na',
  'https://www.bankofsierraleone.org',
  'https://www.centralbank.org.sz',
  'https://www.bankofliberia.org.lr',
  'https://www.bankofsouthsudan.org',
  'https://www.bankoferitrea.org',
  'https://www.ecobank.com',
  'https://www.orabank.net',
  'https://www.afreximbank.com',
  'https://www.afdb.org',
];

const AFRICAN_BANK_HOSTS = new Set(
  AFRICAN_BANK_SOURCE_URLS.map((url) => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }).filter(Boolean)
);

export function isAfricanBankSourceUrl(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl) return false;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    if (AFRICAN_BANK_HOSTS.has(host)) return true;

    // Accept subdomains of known hosts.
    for (const knownHost of AFRICAN_BANK_HOSTS) {
      if (host.endsWith(`.${knownHost}`)) return true;
    }

    return false;
  } catch {
    return false;
  }
}
