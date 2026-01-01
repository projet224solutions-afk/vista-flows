# 🧪 GUIDE DE TEST - BOUTONS DE PARTAGE

**Date :** 1er janvier 2026  
**Version :** 1.0

---

## 🎯 TESTS RAPIDES À EFFECTUER

### ✅ **Test 1 : Partage Produit (2 min)**

1. Ouvrez le marketplace : `/marketplace`
2. Trouvez une carte produit
3. Cliquez sur l'**icône de partage** (en bas à droite de la carte)
4. **Desktop :** Vérifiez que le menu déroulant s'ouvre avec 4 options :
   - ✅ Copier le lien
   - ✅ WhatsApp  
   - ✅ Facebook
   - ✅ Twitter/X
5. **Mobile :** Vérifiez que le menu natif s'ouvre
6. Cliquez sur "Copier le lien"
7. ✅ **Attendu :** Toast vert "Lien copié dans le presse-papier !"

---

### ✅ **Test 2 : Partage Boutique (1 min)**

1. Ouvrez une boutique : `/boutique/[nom-vendeur]`
2. Dans le header (en haut à droite), trouvez le **bouton Partager**
3. ✅ **Vérifiez :** Le bouton est visible avec bordure (pas transparent)
4. Cliquez dessus
5. Testez une des options de partage
6. ✅ **Attendu :** Partage fonctionne correctement

---

### ✅ **Test 3 : Modal Produit (1 min)**

1. Cliquez sur un produit (ouvre le modal)
2. Cherchez **2 boutons de partage** :
   - Un à côté du nom du vendeur (en haut)
   - Un en bas avec le bouton "Contacter"
3. Les deux doivent être des **icônes compactes** (pas des gros boutons)
4. Cliquez sur un des deux
5. ✅ **Attendu :** Menu déroulant fonctionnel

---

### ✅ **Test 4 : WhatsApp (30 sec)**

1. Partagez un produit
2. Choisissez "WhatsApp"
3. ✅ **Attendu :** 
   - Ouvre WhatsApp Web (desktop)
   - Ou l'app WhatsApp (mobile)
   - Message pré-rempli : "Découvrez [Produit] à [Prix] GNF sur 224 Solutions\n[Lien]"

---

### ✅ **Test 5 : Facebook (30 sec)**

1. Partagez un produit
2. Choisissez "Facebook"
3. ✅ **Attendu :** 
   - Popup Facebook Sharer
   - URL du produit pré-remplie
   - Possibilité d'ajouter un message

---

## 🐛 **Si ça ne marche pas**

### **Problème : Menu ne s'ouvre pas**
- Vérifiez la console : `F12` → Console
- Cherchez des erreurs en rouge
- Signalez l'erreur

### **Problème : Bouton invisible**
- Vérifiez quel fichier : Marketplace, VendorShop, ou ProductCard
- Signalez l'emplacement exact

### **Problème : Lien ne se copie pas**
- Testez dans un autre navigateur
- Vérifiez les permissions clipboard

---

## ✅ **Comportement Attendu**

### **Desktop (Ordinateur)**
```
Clic sur bouton partage
    ↓
Menu déroulant avec 4 options
    ↓
Sélection d'une option
    ↓
Action correspondante
```

### **Mobile (Téléphone)**
```
Clic sur bouton partage
    ↓
Menu natif iOS/Android
    ↓
Sélection d'une app
    ↓
Partage dans l'app choisie
```

---

## 🎨 **Apparence Correcte**

### **Bouton Carte Produit**
```
┌─────────────┐
│   [Produit] │
│             │
│  Prix: XXX  │
│ [🛒] [💬] [↗]│ ← Icône partage ici
└─────────────┘
```

### **Bouton Header Boutique**
```
┌────────────────────────────┐
│ [←] Boutique    [Partager] │ ← Bouton visible avec bordure
└────────────────────────────┘
```

### **Modal Produit**
```
┌─────────────────────────┐
│ [Produit]               │
│ Vendeur: XXX        [↗] │ ← Partage boutique (icône)
│ ─────────────────────── │
│ Description...          │
│ ─────────────────────── │
│ [Contacter]        [↗]  │ ← Partage produit (icône)
└─────────────────────────┘
```

---

## 📊 **Checklist de Validation**

- [ ] Partage produit fonctionne (carte)
- [ ] Partage boutique fonctionne (header)
- [ ] Modal affiche 2 boutons partage (icônes)
- [ ] Menu déroulant desktop s'ouvre
- [ ] Menu natif mobile s'ouvre
- [ ] "Copier le lien" affiche toast success
- [ ] WhatsApp s'ouvre avec message pré-rempli
- [ ] Facebook s'ouvre dans popup
- [ ] Twitter s'ouvre dans popup
- [ ] Aucune erreur dans la console

---

## 🚀 **C'EST PRÊT !**

Si tous les tests passent :
✅ **Le système de partage est 100% fonctionnel**

Si un test échoue :
❌ Notez lequel et signalez-le

---

**Durée totale des tests : ~5 minutes**  
**Niveau difficulté : Très facile** 😊
