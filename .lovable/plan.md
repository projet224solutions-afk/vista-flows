

## Diagnostic

**Cause racine identifiee** : Deux contraintes CHECK sur la table `vendors` bloquent silencieusement la creation des comptes de services professionnels.

### Probleme 1 : `business_type` interdit la valeur `'service'`
La contrainte `vendors_business_type_check` n'autorise que : `physical`, `digital`, `hybrid`.
Le code Auth.tsx tente d'inserer `business_type: 'service'` quand un service professionnel est selectionne --- cet INSERT echoue a chaque fois sans que l'utilisateur le sache.

### Probleme 2 : `service_type` manque plusieurs codes
La contrainte `vendors_service_type_check` n'inclut pas : `sport`, `vtc`, `maison`, `general`.
Si l'utilisateur choisit Sport/Fitness, VTC, Maison, ou un compte par defaut, l'INSERT echoue aussi.

### Consequence
Le vendor n'est jamais cree → le retry loop qui verifie le vendor echoue → le professional_service n'est jamais cree → l'utilisateur est redirige vers le dashboard par defaut (vendeur classique) sans enregistrements en base.

---

## Plan de correction

### 1. Migration SQL : Mettre a jour les contraintes CHECK

Modifier les deux contraintes :
- `vendors_business_type_check` : ajouter `'service'` aux valeurs autorisees
- `vendors_service_type_check` : ajouter les codes manquants (`sport`, `vtc`, `maison`, `general`, `digital_livre`, `digital_logiciel`, `dropshipping`)

```sql
ALTER TABLE vendors DROP CONSTRAINT vendors_business_type_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_business_type_check 
  CHECK (business_type IN ('physical', 'digital', 'hybrid', 'service'));

ALTER TABLE vendors DROP CONSTRAINT vendors_service_type_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_service_type_check 
  CHECK (service_type IN (
    'wholesale','retail','mixed','ecommerce','restaurant','beaute',
    'reparation','location','menage','livraison','media','education',
    'sante','voyage','freelance','construction','agriculture',
    'informatique','boutique','salon_coiffure','garage_auto',
    'immobilier','services_pro','photographe','autre',
    'sport','vtc','maison','general','digital_livre',
    'digital_logiciel','dropshipping'
  ));
```

### 2. Auth.tsx : Ajouter un log d'erreur visible

Actuellement, les erreurs de creation vendor/professional_service sont loguees en console mais ignorees. Ajouter une gestion d'erreur qui affiche un toast en cas d'echec pour eviter les echecs silencieux a l'avenir.

### 3. Aucune modification de logique necessaire

Le code dans `handleSubmit` (business_type, service_type, professional_service creation) est deja correct. Une fois les contraintes DB corrigees, tout fonctionnera.

