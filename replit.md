# Overview

224Solutions is a comprehensive multi-role platform for Guinea (West Africa) that combines e-commerce, logistics, financial services, and syndicate management. The system serves multiple user types including customers, vendors, delivery drivers, taxi/moto drivers, syndicate offices, freight forwarders, and administrative roles (PDG/Admin).

The application provides:
- Multi-vendor marketplace with inventory management
- Digital wallet system with multi-currency support
- Real-time logistics and delivery tracking
- Syndicate management for taxi-moto drivers
- Agent/sub-agent commission system
- Communication system (chat, audio/video calls)
- AI Copilot assistant for business operations

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool

**UI Components**: 
- Radix UI primitives for accessible components
- Tailwind CSS for styling with custom design system
- Shadcn/ui component library
- Lucide React for icons

**State Management**:
- React Query (@tanstack/react-query) for server state management and caching
- React Hook Form for form state management
- Custom hooks for business logic (14+ specialized hooks)

**Routing**: React Router DOM for client-side navigation with role-based protected routes

**Code Organization**:
- Lazy loading for all major pages to improve performance
- Custom hooks pattern for reusable business logic (useAuth, useWallet, useSupabaseQuery, etc.)
- Component-based architecture with separation of concerns
- Service layer for API interactions

## Backend Architecture

**Primary Database**: Supabase (PostgreSQL) with Row Level Security (RLS)

**Authentication**: 
- Supabase Auth with JWT tokens
- Firebase Auth integration for mobile
- Custom user ID system (3 letters + 4 digits format, e.g., ABC1234)
- Multi-role authentication (7 user types)

**Key Services**:
- UserService: User management and profile operations
- WalletService: Financial transactions and balance management
- OrderService: E-commerce order processing
- CommunicationService: Real-time messaging and calls
- CommissionService: Automated commission calculations

**Database Schema** (51+ tables):
- User management: profiles, user_roles, user_ids, customers
- E-commerce: vendors, products, product_variants, categories, inventory, orders, warehouse_stocks
- Financial: wallets, wallet_transactions, enhanced_transactions, commissions
- Logistics: rides, drivers, driver_kyc, deliveries
- Syndicate: syndicates, syndicate_members, syndicate_vehicles, syndicate_road_tickets, syndicate_bureaus
- Agent system: pdg, agents, sub_agents, agent_users, commission_settings
- Communication: conversations, messages, calls, user_presence

**Security**:
- Row Level Security (RLS) policies on all tables
- Audit logging for all critical operations
- Rate limiting on authentication endpoints
- SQL injection protection through parameterized queries
- HTTPS-only communication

## External Dependencies

**Cloud Infrastructure**:
- Google Cloud Platform (GCP):
  - Project ID: solutions-ai-app-a8d57
  - Cloud Storage for file uploads
  - Firestore for NoSQL data
  - Cloud Functions for serverless operations
  - Maps API for geolocation

**Database & Backend**:
- Supabase PostgreSQL (primary database)
  - Real-time subscriptions via WebSockets
  - Storage for file management
  - Edge Functions for serverless logic
  - Built-in authentication

**Communication Services**:
- Agora.io (Fully Integrated):
  - App ID: 6eb615539e434ff0991bb5f59dbca7ad
  - RTM (Real-Time Messaging) for chat
  - RTC (Real-Time Communication) for audio/video calls
  - Token-based authentication via backend
  - UUID support for user identification
  - 5 API endpoints: /rtc-token, /rtm-token, /session-tokens, /generate-channel, /config
  - Rate limiting: 50 tokens per 15 minutes
  - Database tables: conversations, messages, calls, user_presence

**AI/ML Services**:
- OpenAI API for AI Copilot (ChatGPT-style assistant)
- AI-powered fraud detection for transactions
- Automated analytics and insights

**Payment Integrations**:
- PayPal API for international payments
- Stripe for card processing
- Mobile Money integration for local payments (Orange Money, MTN, etc.)
- Custom wallet system with 1.5% commission + 1000 GNF fixed fee

**Mobile Services**:
- Firebase Cloud Messaging (FCM) for push notifications
- Firebase Auth for mobile authentication
- React Native for cross-platform mobile apps

**Geolocation**:
- Mapbox API for maps and tracking
- Google Maps API integration
- Real-time GPS tracking for deliveries

**Email/SMS**:
- Nodemailer for email notifications
- Multiple SMTP providers support (Gmail, Outlook, custom)
- SMS integration for notifications (to be configured)

**Development Tools**:
- GitHub for version control
- Lovable.dev for deployment (migrated to Replit)
- Cursor for AI-assisted development
- ESLint and TypeScript for code quality

# Recent Changes

## October 7, 2025 - Agora Communication System Integration
- **Backend Service**: Created TypeScript Agora service (server/services/agora.ts) with UUID support
  - Supports both UUID strings and numeric UIDs for tokens
  - RTC token generation for video/voice calls
  - RTM token generation for real-time messaging
  - Rate limiting and error handling
- **API Routes**: Integrated 5 authenticated Agora endpoints in server/routes.ts
- **Database**: Added 4 communication tables (conversations, messages, calls, user_presence)
- **Frontend Service**: Created communicationService.ts for API interactions
- **Configuration**: Fixed Vite config with allowedHosts for Replit iframe support
- **Dependencies**: Installed agora-token package v2.0.5
- **Status**: Fully functional, requires AGORA_APP_CERTIFICATE in Replit Secrets