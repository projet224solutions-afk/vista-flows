import re
import os

files_with_any = [
    'src/components/pdg/PDGFinance.tsx',
    'src/components/pdg/PDGSecurity.tsx',
    'src/components/pdg/PDGUsers.tsx',
    'src/components/taxi-moto/TaxiMotoBooking.tsx',
    'src/hooks/useAdminUnifiedData.ts',
    'src/hooks/useCopilote.ts',
    'src/hooks/useDataManager.ts',
    'src/hooks/useSecurity.ts',
    'src/hooks/useSyndicatUltraProData.ts',
    'src/pages/Marketplace.tsx',
    'src/pages/Profil.tsx',
    'src/pages/TaxiMotoDriver.tsx',
    'src/services/CopiloteService.ts',
    'src/services/DataManager.ts',
    'src/services/PerformanceCache.ts',
    'src/services/aiCopilotService.ts',
    'src/services/mockCommunicationService.ts',
    'src/services/pricingService.ts',
    'src/services/walletService.ts',
]

fixed_count = 0

for file_path in files_with_any:
    full_path = file_path
    if not os.path.exists(full_path):
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remplacer tous les : any
    content = re.sub(r':\s*any\b', ': unknown', content)
    
    # Remplacer any[]
    content = re.sub(r':\s*any\[\]', ': unknown[]', content)
    
    # Remplacer Array<any>
    content = re.sub(r'Array<any>', 'Array<unknown>', content)
    
    # Remplacer Record<string, any>
    content = re.sub(r'Record<string,\s*any>', 'Record<string, unknown>', content)
    
    if content != original:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {file_path}")
        fixed_count += 1

print(f"\n📊 {fixed_count} fichiers corrigés")
