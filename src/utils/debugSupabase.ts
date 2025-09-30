import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const debugSupabaseConnection = async () => {
    console.log("🔍 DEBUG SUPABASE - Début du diagnostic...");

    try {
        // 1. Test de connexion Supabase
        console.log("📡 Test de connexion Supabase...");
        const { data: connectionTest, error: connectionError } = await supabase
            .from('profiles')
            .select('count(*)')
            .limit(1);

        if (connectionError) {
            console.error("❌ Erreur de connexion Supabase:", connectionError);
            toast.error("Erreur de connexion à la base de données");
            return { success: false, error: "connection_failed" };
        }

        console.log("✅ Connexion Supabase OK");

        // 2. Vérifier l'utilisateur actuel
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("❌ Utilisateur non connecté:", userError);
            toast.error("Utilisateur non connecté");
            return { success: false, error: "user_not_authenticated" };
        }

        console.log("✅ Utilisateur connecté:", user.id);

        // 3. Vérifier le profil utilisateur
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("❌ Erreur profil:", profileError);
            toast.error("Profil utilisateur non trouvé");
            return { success: false, error: "profile_not_found" };
        }

        console.log("✅ Profil trouvé:", profile);

        // 4. Si c'est un vendeur, vérifier le profil vendeur
        if (profile.role === 'vendeur') {
            const { data: vendor, error: vendorError } = await supabase
                .from('vendors')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (vendorError || !vendor) {
                console.log("⚠️ Profil vendeur manquant, création en cours...");

                // Créer le profil vendeur
                const { data: newVendor, error: createVendorError } = await supabase
                    .from('vendors')
                    .insert({
                        user_id: user.id,
                        business_name: `${profile.first_name} ${profile.last_name} Store`,
                        contact_email: profile.email,
                        is_active: true,
                        status: 'active'
                    })
                    .select()
                    .single();

                if (createVendorError) {
                    console.error("❌ Erreur création vendeur:", createVendorError);
                    toast.error("Impossible de créer le profil vendeur");
                    return { success: false, error: "vendor_creation_failed" };
                }

                console.log("✅ Profil vendeur créé:", newVendor);
                toast.success("Profil vendeur créé avec succès !");
            } else {
                console.log("✅ Profil vendeur existant:", vendor);
            }
        }

        // 5. Vérifier les tables nécessaires
        const tables = ['categories', 'products', 'orders'];
        for (const table of tables) {
            const { error: tableError } = await supabase
                .from(table)
                .select('count(*)')
                .limit(1);

            if (tableError) {
                console.error(`❌ Erreur table ${table}:`, tableError);
            } else {
                console.log(`✅ Table ${table} accessible`);
            }
        }

        console.log("✅ Diagnostic Supabase terminé avec succès");
        toast.success("Diagnostic Supabase réussi - Toutes les fonctionnalités sont opérationnelles !");

        return {
            success: true,
            user,
            profile,
            message: "Toutes les vérifications sont passées"
        };

    } catch (error) {
        console.error("❌ Erreur générale:", error);
        toast.error("Erreur lors du diagnostic Supabase");
        return { success: false, error: "general_error", details: error };
    }
};

export const fixVendorProfile = async () => {
    console.log("🔧 Correction du profil vendeur...");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Utilisateur non connecté");
            return false;
        }

        // Vérifier si le profil existe
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile) {
            toast.error("Profil utilisateur non trouvé");
            return false;
        }

        // Si ce n'est pas un vendeur, on ne peut pas créer le profil vendeur
        if (profile.role !== 'vendeur') {
            toast.info(`Utilisateur avec rôle: ${profile.role}. Changez le rôle en 'vendeur' si nécessaire.`);
            return false;
        }

        // Vérifier si le profil vendeur existe déjà
        const { data: existingVendor } = await supabase
            .from('vendors')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (existingVendor) {
            toast.success("Profil vendeur existe déjà !");
            return true;
        }

        // Créer le profil vendeur
        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
                user_id: user.id,
                business_name: `${profile.first_name || 'Vendeur'} ${profile.last_name || 'Store'}`,
                contact_email: profile.email,
                is_active: true,
                status: 'active',
                business_type: 'retail',
                description: 'Boutique créée automatiquement'
            })
            .select()
            .single();

        if (vendorError) {
            console.error("Erreur création vendeur:", vendorError);
            toast.error("Impossible de créer le profil vendeur: " + vendorError.message);
            return false;
        }

        toast.success("✅ Profil vendeur créé avec succès !");
        console.log("Vendeur créé:", vendor);
        return true;

    } catch (error) {
        console.error("Erreur:", error);
        toast.error("Erreur lors de la correction du profil vendeur");
        return false;
    }
};

export const testProductCreation = async () => {
    console.log("🧪 Test de création de produit...");

    try {
        const result = await debugSupabaseConnection();
        if (!result.success) {
            return false;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Récupérer le vendeur
        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (vendorError || !vendor) {
            toast.error("Profil vendeur non trouvé");
            return false;
        }

        // Récupérer une catégorie
        const { data: categories } = await supabase
            .from('categories')
            .select('id')
            .eq('is_active', true)
            .limit(1);

        const categoryId = categories?.[0]?.id || null;

        // Créer un produit de test
        const testProduct = {
            vendor_id: vendor.id,
            name: `Produit Test ${Date.now()}`,
            description: 'Produit créé automatiquement pour tester la fonctionnalité',
            price: 10000,
            stock_quantity: 100,
            low_stock_threshold: 10,
            is_active: true,
            category_id: categoryId,
            sku: `TEST-${Date.now()}`,
            created_at: new Date().toISOString()
        };

        const { data: product, error: productError } = await supabase
            .from('products')
            .insert(testProduct)
            .select()
            .single();

        if (productError) {
            console.error("Erreur création produit:", productError);
            toast.error("Erreur lors de la création du produit: " + productError.message);
            return false;
        }

        toast.success("✅ Produit de test créé avec succès !");
        console.log("Produit créé:", product);
        return true;

    } catch (error) {
        console.error("Erreur test produit:", error);
        toast.error("Erreur lors du test de création de produit");
        return false;
    }
};

