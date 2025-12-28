import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fonction de recherche de produits avec infos boutique enrichies
async function searchProducts(supabaseClient: any, query: string, category?: string, maxPrice?: number, minPrice?: number) {
  console.log("Searching products with:", { query, category, maxPrice, minPrice });
  
  let queryBuilder = supabaseClient
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      compare_at_price,
      images,
      category_id,
      stock_quantity,
      is_active,
      is_hot,
      is_new,
      rating,
      reviews_count,
      vendor_id,
      vendor:vendors(
        id,
        business_name,
        logo_url,
        description,
        phone,
        email,
        address,
        city,
        country,
        rating,
        is_verified,
        delivery_options
      ),
      category:categories(name)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  // Recherche textuelle
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  // Filtres optionnels
  if (category) {
    const { data: cat } = await supabaseClient
      .from('categories')
      .select('id')
      .ilike('name', `%${category}%`)
      .limit(1)
      .maybeSingle();
    
    if (cat) {
      queryBuilder = queryBuilder.eq('category_id', cat.id);
    }
  }

  if (maxPrice) {
    queryBuilder = queryBuilder.lte('price', maxPrice);
  }

  if (minPrice) {
    queryBuilder = queryBuilder.gte('price', minPrice);
  }

  const { data: products, error } = await queryBuilder
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Product search error:", error);
    return [];
  }

  return products?.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description?.substring(0, 150) + (p.description?.length > 150 ? '...' : ''),
    price: p.price,
    oldPrice: p.compare_at_price,
    image: p.images?.[0] || null,
    stock: p.stock_quantity,
    rating: p.rating,
    reviewsCount: p.reviews_count,
    isHot: p.is_hot,
    isNew: p.is_new,
    category: p.category?.name || 'Non catégorisé',
    // Informations enrichies de la boutique
    vendorId: p.vendor_id,
    boutique: {
      name: p.vendor?.business_name || 'Vendeur 224',
      logo: p.vendor?.logo_url,
      description: p.vendor?.description,
      phone: p.vendor?.phone,
      email: p.vendor?.email,
      address: p.vendor?.address,
      city: p.vendor?.city,
      country: p.vendor?.country || 'Guinée',
      rating: p.vendor?.rating,
      isVerified: p.vendor?.is_verified,
      deliveryOptions: p.vendor?.delivery_options
    }
  })) || [];
}

// Fonction pour obtenir les détails d'une boutique/vendeur
async function getVendorDetails(supabaseClient: any, vendorId?: string, vendorName?: string) {
  console.log("Getting vendor details:", { vendorId, vendorName });
  
  let query = supabaseClient
    .from('vendors')
    .select(`
      id,
      business_name,
      logo_url,
      description,
      phone,
      email,
      address,
      city,
      country,
      rating,
      is_verified,
      delivery_options,
      opening_hours,
      social_links,
      created_at
    `);

  if (vendorId) {
    query = query.eq('id', vendorId);
  } else if (vendorName) {
    query = query.ilike('business_name', `%${vendorName}%`);
  } else {
    return { error: "Veuillez fournir un ID ou nom de boutique" };
  }

  const { data: vendor, error } = await query.single();

  if (error || !vendor) {
    console.error("Vendor fetch error:", error);
    return { error: "Boutique non trouvée" };
  }

  // Récupérer les produits de cette boutique
  const { data: products } = await supabaseClient
    .from('products')
    .select('id, name, price, images, rating, reviews_count')
    .eq('vendor_id', vendor.id)
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(5);

  // Compter le total des produits
  const { count: totalProducts } = await supabaseClient
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('is_active', true);

  return {
    id: vendor.id,
    name: vendor.business_name,
    logo: vendor.logo_url,
    description: vendor.description,
    contact: {
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      city: vendor.city,
      country: vendor.country || 'Guinée'
    },
    rating: vendor.rating,
    isVerified: vendor.is_verified,
    deliveryOptions: vendor.delivery_options,
    openingHours: vendor.opening_hours,
    socialLinks: vendor.social_links,
    memberSince: vendor.created_at,
    totalProducts: totalProducts || 0,
    featuredProducts: products?.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images?.[0],
      rating: p.rating
    })) || []
  };
}

// Fonction pour obtenir les produits d'une boutique spécifique
async function getVendorProducts(supabaseClient: any, vendorId?: string, vendorName?: string, limit = 10) {
  console.log("Getting vendor products:", { vendorId, vendorName, limit });

  let vendorIdToUse = vendorId;

  // Si on a le nom, chercher l'ID
  if (!vendorIdToUse && vendorName) {
    const { data: vendor } = await supabaseClient
      .from('vendors')
      .select('id')
      .ilike('business_name', `%${vendorName}%`)
      .limit(1)
      .single();
    
    vendorIdToUse = vendor?.id;
  }

  if (!vendorIdToUse) {
    return { error: "Boutique non trouvée" };
  }

  const { data: products } = await supabaseClient
    .from('products')
    .select(`
      id, name, description, price, compare_at_price, images, 
      rating, reviews_count, stock_quantity, is_hot, is_new,
      category:categories(name)
    `)
    .eq('vendor_id', vendorIdToUse)
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('rating', { ascending: false })
    .limit(limit);

  return products?.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description?.substring(0, 100),
    price: p.price,
    oldPrice: p.compare_at_price,
    image: p.images?.[0],
    rating: p.rating,
    reviewsCount: p.reviews_count,
    stock: p.stock_quantity,
    category: p.category?.name,
    isHot: p.is_hot,
    isNew: p.is_new
  })) || [];
}

// Fonction pour rechercher les services de proximité
async function searchProximityServices(supabaseClient: any, query?: string, serviceType?: string) {
  console.log("Searching proximity services:", { query, serviceType });

  let queryBuilder = supabaseClient
    .from('professional_services')
    .select(`
      id,
      business_name,
      description,
      logo_url,
      address,
      phone,
      email,
      opening_hours,
      status,
      verification_status,
      rating,
      total_reviews,
      service_type:service_types(id, name, description)
    `)
    .eq('status', 'active');

  // Filtre par type de service
  if (serviceType) {
    const { data: sType } = await supabaseClient
      .from('service_types')
      .select('id')
      .ilike('name', `%${serviceType}%`)
      .limit(1)
      .single();
    
    if (sType) {
      queryBuilder = queryBuilder.eq('service_type_id', sType.id);
    }
  }

  // Recherche textuelle
  if (query) {
    queryBuilder = queryBuilder.or(`business_name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  const { data: services, error } = await queryBuilder
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Service search error:", error);
    return [];
  }

  return services?.map((s: any) => ({
    id: s.id,
    name: s.business_name,
    description: s.description?.substring(0, 150),
    logo: s.logo_url,
    address: s.address,
    phone: s.phone,
    email: s.email,
    openingHours: s.opening_hours,
    rating: s.rating,
    totalReviews: s.total_reviews,
    isVerified: s.verification_status === 'verified',
    serviceType: s.service_type?.name || 'Service'
  })) || [];
}

// Fonction pour obtenir les types de services disponibles
async function getServiceTypes(supabaseClient: any) {
  const { data: types } = await supabaseClient
    .from('service_types')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name');
  
  return types || [];
}

// Fonction pour obtenir les taxi-moto disponibles
async function getAvailableTaxiDrivers(supabaseClient: any, vehicleType?: string) {
  console.log("Getting available taxi drivers:", { vehicleType });

  let query = supabaseClient
    .from('taxi_drivers')
    .select(`
      id,
      user_id,
      vehicle_type,
      vehicle_plate,
      vehicle,
      rating,
      total_rides,
      is_online,
      status,
      last_lat,
      last_lng,
      last_seen,
      profile:user_id(full_name, phone, avatar_url)
    `)
    .eq('is_online', true)
    .in('status', ['available', 'active']);

  if (vehicleType) {
    query = query.ilike('vehicle_type', `%${vehicleType}%`);
  }

  const { data: drivers, error } = await query
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Taxi drivers fetch error:", error);
    return [];
  }

  return drivers?.map((d: any) => ({
    id: d.id,
    name: d.profile?.full_name || 'Chauffeur',
    phone: d.profile?.phone,
    avatar: d.profile?.avatar_url,
    vehicleType: d.vehicle_type || 'Moto',
    vehiclePlate: d.vehicle_plate,
    vehicleInfo: d.vehicle,
    rating: d.rating,
    totalRides: d.total_rides,
    isOnline: d.is_online,
    status: d.status,
    lastSeen: d.last_seen
  })) || [];
}

// Fonction pour obtenir les livreurs disponibles
async function getAvailableDeliveryDrivers(supabaseClient: any, vehicleType?: string) {
  console.log("Getting available delivery drivers:", { vehicleType });

  let query = supabaseClient
    .from('drivers')
    .select(`
      id,
      full_name,
      phone_number,
      email,
      vehicle_type,
      vehicle_info,
      rating,
      total_deliveries,
      is_online,
      is_verified,
      status
    `)
    .eq('is_online', true)
    .in('status', ['available', 'active']);

  if (vehicleType) {
    query = query.eq('vehicle_type', vehicleType);
  }

  const { data: drivers, error } = await query
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Delivery drivers fetch error:", error);
    return [];
  }

  return drivers?.map((d: any) => ({
    id: d.id,
    name: d.full_name,
    phone: d.phone_number,
    email: d.email,
    vehicleType: d.vehicle_type || 'Moto',
    vehicleInfo: d.vehicle_info,
    rating: d.rating,
    totalDeliveries: d.total_deliveries,
    isOnline: d.is_online,
    isVerified: d.is_verified,
    status: d.status
  })) || [];
}

// Fonction pour obtenir les catégories disponibles
async function getCategories(supabaseClient: any) {
  const { data: categories } = await supabaseClient
    .from('categories')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name');
  
  return categories || [];
}

// Fonction pour obtenir les produits populaires
async function getPopularProducts(supabaseClient: any, limit = 5) {
  const { data: products } = await supabaseClient
    .from('products')
    .select(`
      id, name, price, images, rating, reviews_count,
      vendor:vendors(business_name),
      category:categories(name)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('reviews_count', { ascending: false })
    .limit(limit);

  return products?.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.images?.[0],
    vendor: p.vendor?.business_name,
    category: p.category?.name,
    rating: p.rating,
    reviewsCount: p.reviews_count
  })) || [];
}

// Fonction pour rechercher les avis produits
async function searchProductReviews(supabaseClient: any, productName?: string, minRating?: number, limit = 10) {
  console.log("Searching product reviews:", { productName, minRating, limit });

  let query = supabaseClient
    .from('product_reviews')
    .select(`
      id,
      rating,
      title,
      content,
      verified_purchase,
      helpful_count,
      photos,
      created_at,
      product:products(id, name, images, price),
      user:profiles!product_reviews_user_id_fkey(full_name, avatar_url)
    `)
    .eq('is_approved', true);

  if (minRating) {
    query = query.gte('rating', minRating);
  }

  const { data: reviews, error } = await query
    .order('helpful_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Reviews search error:", error);
    return [];
  }

  // Filtrer par nom de produit si spécifié
  let filteredReviews = reviews || [];
  if (productName) {
    filteredReviews = filteredReviews.filter((r: any) => 
      r.product?.name?.toLowerCase().includes(productName.toLowerCase())
    );
  }

  return filteredReviews.map((r: any) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    content: r.content?.substring(0, 200),
    isVerifiedPurchase: r.verified_purchase,
    helpfulCount: r.helpful_count,
    photos: r.photos,
    createdAt: r.created_at,
    productName: r.product?.name,
    productImage: r.product?.images?.[0],
    productPrice: r.product?.price,
    reviewerName: r.user?.full_name || 'Client anonyme'
  }));
}

// Fonction pour obtenir les meilleurs vendeurs
async function getTopVendors(supabaseClient: any, limit = 10) {
  console.log("Getting top vendors:", { limit });

  const { data: vendors, error } = await supabaseClient
    .from('vendors')
    .select(`
      id,
      business_name,
      logo_url,
      description,
      address,
      city,
      phone,
      email,
      rating,
      is_verified,
      delivery_options,
      created_at
    `)
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Top vendors fetch error:", error);
    return [];
  }

  // Pour chaque vendeur, compter les produits
  const vendorsWithStats = await Promise.all((vendors || []).map(async (v: any) => {
    const { count: productCount } = await supabaseClient
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', v.id)
      .eq('is_active', true);

    return {
      id: v.id,
      name: v.business_name,
      logo: v.logo_url,
      description: v.description?.substring(0, 100),
      address: v.address,
      city: v.city,
      phone: v.phone,
      email: v.email,
      rating: v.rating,
      isVerified: v.is_verified,
      deliveryOptions: v.delivery_options,
      productCount: productCount || 0,
      memberSince: v.created_at
    };
  }));

  return vendorsWithStats;
}

// Fonction de recherche globale dans tout le marketplace
async function globalMarketplaceSearch(supabaseClient: any, query: string, limit = 5) {
  console.log("Global marketplace search:", { query, limit });

  const results: any = {
    products: [],
    vendors: [],
    services: [],
    categories: []
  };

  // Recherche de produits
  const { data: products } = await supabaseClient
    .from('products')
    .select(`
      id, name, description, price, images, rating, reviews_count,
      vendor:vendors(business_name),
      category:categories(name)
    `)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('rating', { ascending: false })
    .limit(limit);

  results.products = (products || []).map((p: any) => ({
    type: 'product',
    id: p.id,
    name: p.name,
    description: p.description?.substring(0, 100),
    price: p.price,
    image: p.images?.[0],
    rating: p.rating,
    vendor: p.vendor?.business_name,
    category: p.category?.name
  }));

  // Recherche de vendeurs
  const { data: vendors } = await supabaseClient
    .from('vendors')
    .select('id, business_name, logo_url, description, rating, city, is_verified')
    .eq('status', 'active')
    .or(`business_name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('rating', { ascending: false })
    .limit(limit);

  results.vendors = (vendors || []).map((v: any) => ({
    type: 'vendor',
    id: v.id,
    name: v.business_name,
    logo: v.logo_url,
    description: v.description?.substring(0, 100),
    rating: v.rating,
    city: v.city,
    isVerified: v.is_verified
  }));

  // Recherche de services de proximité
  const { data: services } = await supabaseClient
    .from('professional_services')
    .select(`
      id, business_name, description, logo_url, rating, address,
      service_type:service_types(name)
    `)
    .eq('status', 'active')
    .or(`business_name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('rating', { ascending: false })
    .limit(limit);

  results.services = (services || []).map((s: any) => ({
    type: 'service',
    id: s.id,
    name: s.business_name,
    description: s.description?.substring(0, 100),
    logo: s.logo_url,
    rating: s.rating,
    address: s.address,
    serviceType: s.service_type?.name
  }));

  // Recherche de catégories
  const { data: categories } = await supabaseClient
    .from('categories')
    .select('id, name, description')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(limit);

  results.categories = (categories || []).map((c: any) => ({
    type: 'category',
    id: c.id,
    name: c.name,
    description: c.description
  }));

  return {
    query: query,
    totalResults: results.products.length + results.vendors.length + results.services.length + results.categories.length,
    ...results
  };
}

// Fonction pour obtenir les statistiques du marketplace
async function getMarketplaceStats(supabaseClient: any) {
  console.log("Getting marketplace stats");

  const [productsCount, vendorsCount, categoriesCount, reviewsCount] = await Promise.all([
    supabaseClient.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseClient.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseClient.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseClient.from('product_reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true)
  ]);

  // Top catégories par nombre de produits
  const { data: topCategories } = await supabaseClient
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .limit(5);

  return {
    totalProducts: productsCount.count || 0,
    totalVendors: vendorsCount.count || 0,
    totalCategories: categoriesCount.count || 0,
    totalReviews: reviewsCount.count || 0,
    topCategories: topCategories || []
  };
}

// Définition des outils disponibles pour l'IA
const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Rechercher des produits dans le marketplace par nom, description ou catégorie. Utilise cette fonction quand le client demande des produits, veut acheter quelque chose, ou cherche un article spécifique. Les résultats incluent les informations de la boutique.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Terme de recherche (nom du produit, type d'article, etc.)"
          },
          category: {
            type: "string",
            description: "Catégorie de produit (ex: électronique, vêtements, alimentation)"
          },
          max_price: {
            type: "number",
            description: "Prix maximum en GNF"
          },
          min_price: {
            type: "number",
            description: "Prix minimum en GNF"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_vendor_details",
      description: "Obtenir les informations détaillées d'une boutique/vendeur: contact, adresse, horaires, produits phares, etc. Utilise cette fonction quand le client veut en savoir plus sur un vendeur ou une boutique spécifique.",
      parameters: {
        type: "object",
        properties: {
          vendor_id: {
            type: "string",
            description: "ID unique de la boutique (si connu)"
          },
          vendor_name: {
            type: "string",
            description: "Nom de la boutique à rechercher"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_vendor_products",
      description: "Obtenir tous les produits d'une boutique spécifique. Utilise cette fonction quand le client veut voir ce qu'une boutique vend.",
      parameters: {
        type: "object",
        properties: {
          vendor_id: {
            type: "string",
            description: "ID unique de la boutique"
          },
          vendor_name: {
            type: "string",
            description: "Nom de la boutique"
          },
          limit: {
            type: "number",
            description: "Nombre de produits à retourner (max 20)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_proximity_services",
      description: "Rechercher des services de proximité (beauté, réparation, restauration, ménage, santé, formation, etc.). Utilise cette fonction quand le client cherche un service local ou professionnel.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Terme de recherche (nom du service, type d'activité)"
          },
          service_type: {
            type: "string",
            description: "Type de service (ex: Beauté, Réparation, Restauration, Ménage, Santé, Formation)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_service_types",
      description: "Obtenir la liste des types de services de proximité disponibles. Utilise cette fonction pour montrer au client les catégories de services.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_taxi_drivers",
      description: "Obtenir les chauffeurs de taxi-moto disponibles. Utilise cette fonction quand le client cherche un taxi, un moto-taxi, ou veut se déplacer.",
      parameters: {
        type: "object",
        properties: {
          vehicle_type: {
            type: "string",
            description: "Type de véhicule (moto, voiture, tricycle)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_delivery_drivers",
      description: "Obtenir les livreurs disponibles. Utilise cette fonction quand le client veut faire livrer quelque chose ou cherche un coursier.",
      parameters: {
        type: "object",
        properties: {
          vehicle_type: {
            type: "string",
            description: "Type de véhicule (moto, vélo, voiture)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Obtenir la liste des catégories de produits disponibles. Utilise cette fonction quand le client veut savoir quels types de produits sont disponibles.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_popular_products",
      description: "Obtenir les produits les plus populaires. Utilise cette fonction quand le client demande des recommandations ou les produits tendance.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de produits à retourner (max 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_product_reviews",
      description: "Rechercher les avis et commentaires sur les produits. Utilise cette fonction quand le client veut voir les avis, les notes, ou ce que les autres clients pensent d'un produit.",
      parameters: {
        type: "object",
        properties: {
          product_name: {
            type: "string",
            description: "Nom du produit pour filtrer les avis"
          },
          min_rating: {
            type: "number",
            description: "Note minimum (1-5)"
          },
          limit: {
            type: "number",
            description: "Nombre d'avis à retourner (max 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_vendors",
      description: "Obtenir les meilleurs vendeurs/fournisseurs du marketplace. Utilise cette fonction quand le client cherche les vendeurs les mieux notés, les plus fiables, ou veut des recommandations de boutiques.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de vendeurs à retourner (max 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "global_marketplace_search",
      description: "Recherche globale dans tout le marketplace: produits, vendeurs, services, catégories. Utilise cette fonction quand le client fait une recherche générale ou veut explorer tout ce qui est disponible.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Terme de recherche global"
          },
          limit: {
            type: "number",
            description: "Nombre de résultats par type (max 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_marketplace_stats",
      description: "Obtenir les statistiques générales du marketplace: nombre de produits, vendeurs, catégories, avis. Utilise cette fonction quand le client veut connaître la taille ou l'activité du marketplace.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(supabaseUrl!, supabaseKey!);
    
    // Récupérer l'utilisateur authentifié
    let userId: string | null = null;
    let userRole: string = "client";
    let userContext: any = {};
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      
      if (userId) {
        // Récupérer le profil utilisateur
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', userId)
          .single();
          
        // Récupérer le wallet
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('id, balance, currency')
          .eq('user_id', userId)
          .single();
          
        // Récupérer les dernières transactions
        const { data: transactions } = await supabaseClient
          .from('wallet_transactions')
          .select('amount, transaction_type, status, created_at')
          .eq('wallet_id', wallet?.id || '')
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Récupérer les dernières commandes
        const { data: orders } = await supabaseClient
          .from('orders')
          .select('order_number, status, total_amount, created_at')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        userContext = {
          name: profile?.full_name || "Client",
          balance: wallet?.balance || 0,
          currency: wallet?.currency || "GNF",
          recentTransactions: transactions || [],
          recentOrders: orders || []
        };
      }
    }

    const body = await req.json();
    const { message, messages, role = "client" } = body;
    
    let conversationMessages = [];
    if (message) {
      conversationMessages = [{ role: "user", content: message }];
    } else if (messages && Array.isArray(messages)) {
      conversationMessages = messages;
    } else {
      throw new Error("Message requis");
    }

    // Prompt système spécifique au CLIENT avec capacité de recherche complète
    const clientSystemPrompt = `Tu es l'assistant IA de 224Solutions, dédié aux CLIENTS. Tu as accès à TOUT le marketplace.

🎯 TON RÔLE:
Tu aides les clients de la plateforme 224Solutions avec leurs activités d'achat, de services et de gestion de compte.
Tu as accès à des fonctions de RECHERCHE COMPLÈTES sur tout le système.

📊 CONTEXTE UTILISATEUR:
- Nom: ${userContext.name || "Client"}
- Solde wallet: ${userContext.balance?.toLocaleString() || 0} ${userContext.currency || "GNF"}
- Dernières transactions: ${JSON.stringify(userContext.recentTransactions || [])}
- Dernières commandes: ${JSON.stringify(userContext.recentOrders || [])}

✅ TES CAPACITÉS DE RECHERCHE COMPLÈTES:

1. **🔍 RECHERCHE GLOBALE**:
   - global_marketplace_search: Recherche dans TOUT (produits, vendeurs, services, catégories)
   - get_marketplace_stats: Statistiques du marketplace (nb produits, vendeurs, avis)

2. **🛒 PRODUITS**:
   - search_products: Recherche par nom, catégorie, prix
   - get_popular_products: Produits les mieux notés/populaires
   - get_categories: Toutes les catégories disponibles

3. **⭐ AVIS & ÉVALUATIONS**:
   - search_product_reviews: Voir les avis clients, notes, commentaires

4. **🏪 VENDEURS & BOUTIQUES**:
   - get_top_vendors: Les meilleurs vendeurs/fournisseurs
   - get_vendor_details: Infos complètes d'une boutique
   - get_vendor_products: Tous les produits d'un vendeur

5. **🛠️ SERVICES DE PROXIMITÉ**:
   - search_proximity_services: Services locaux (beauté, réparation, resto...)
   - get_service_types: Types de services disponibles

6. **🏍️ TRANSPORT**:
   - get_available_taxi_drivers: Taxi-moto disponibles
   - get_available_delivery_drivers: Livreurs/coursiers disponibles

7. **💰 COMPTE CLIENT**:
   - Solde wallet, historique transactions
   - Suivi commandes

💡 INSTRUCTIONS IMPORTANTES:
- UTILISE TOUJOURS les outils pour répondre aux questions sur le marketplace
- Pour une recherche générale: utilise global_marketplace_search
- Pour les meilleurs vendeurs: utilise get_top_vendors
- Pour les avis: utilise search_product_reviews
- Présente les résultats de façon claire et structurée
- Inclus toujours: nom, prix, note, vendeur pour les produits
- Inclus toujours: nom, note, nb produits, ville pour les vendeurs

❌ RESTRICTIONS:
- NE PAS aider avec les fonctionnalités vendeur/admin
- NE PAS divulguer d'infos système sensibles`;

    // Premier appel: demander à l'IA si elle veut utiliser des outils
    const initialRequest = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: clientSystemPrompt },
        ...conversationMessages,
      ],
      tools: tools,
      tool_choice: "auto"
    };

    console.log("Calling Lovable AI Gateway for client assistant with tools...");

    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initialRequest),
    });

    if (!initialResponse.ok) {
      if (initialResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (initialResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices?.[0]?.message;

    // Vérifier si l'IA veut utiliser des outils
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("AI wants to use tools:", assistantMessage.tool_calls);
      
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
        let result;
        
        switch (functionName) {
          case "search_products":
            result = await searchProducts(supabaseClient, args.query, args.category, args.max_price, args.min_price);
            break;
          case "get_vendor_details":
            result = await getVendorDetails(supabaseClient, args.vendor_id, args.vendor_name);
            break;
          case "get_vendor_products":
            result = await getVendorProducts(supabaseClient, args.vendor_id, args.vendor_name, args.limit || 10);
            break;
          case "search_proximity_services":
            result = await searchProximityServices(supabaseClient, args.query, args.service_type);
            break;
          case "get_service_types":
            result = await getServiceTypes(supabaseClient);
            break;
          case "get_available_taxi_drivers":
            result = await getAvailableTaxiDrivers(supabaseClient, args.vehicle_type);
            break;
          case "get_available_delivery_drivers":
            result = await getAvailableDeliveryDrivers(supabaseClient, args.vehicle_type);
            break;
          case "get_categories":
            result = await getCategories(supabaseClient);
            break;
          case "get_popular_products":
            result = await getPopularProducts(supabaseClient, args.limit || 5);
            break;
          case "search_product_reviews":
            result = await searchProductReviews(supabaseClient, args.product_name, args.min_rating, args.limit || 10);
            break;
          case "get_top_vendors":
            result = await getTopVendors(supabaseClient, args.limit || 10);
            break;
          case "global_marketplace_search":
            result = await globalMarketplaceSearch(supabaseClient, args.query, args.limit || 5);
            break;
          case "get_marketplace_stats":
            result = await getMarketplaceStats(supabaseClient);
            break;
          default:
            result = { error: "Fonction inconnue" };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
        
        console.log(`Tool ${functionName} result:`, result);
      }

      // Deuxième appel avec les résultats des outils (streaming)
      const finalRequest = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: clientSystemPrompt },
          ...conversationMessages,
          assistantMessage,
          ...toolResults
        ],
        stream: true
      };

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRequest),
      });

      if (!finalResponse.ok) {
        throw new Error("Erreur lors de la génération de la réponse finale");
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Si pas d'outils utilisés, streamer directement
    const streamRequest = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: clientSystemPrompt },
        ...conversationMessages,
      ],
      stream: true,
    };

    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(streamRequest),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("client-ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
