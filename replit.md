# Overview

224Solutions is a comprehensive multi-role platform for Guinea (West Africa) designed to integrate e-commerce, logistics, financial services, and syndicate management. It supports a wide range of users including customers, vendors, drivers, syndicate operators, freight forwarders, and administrators, aiming to provide a robust digital ecosystem for local commerce and services. Key capabilities include a multi-vendor marketplace, digital wallet, real-time logistics, syndicate management for transport, and an AI Copilot.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Vite for fast development. UI components leverage Radix UI, Tailwind CSS for styling with a custom design system, Shadcn/ui, and Lucide React for icons. State management is handled by React Query for server state and React Hook Form for form management, complemented by a suite of custom hooks for business logic. Client-side navigation uses React Router DOM with role-based protected routes. The codebase emphasizes a component-based architecture with lazy loading for performance and a dedicated service layer for API interactions.

## Backend Architecture
The backend primarily uses Supabase (PostgreSQL) with Row Level Security (RLS) for data persistence and security. Authentication is managed via Supabase Auth with JWT tokens, supporting multi-role access (7 user types). The system integrates Firebase Auth for mobile clients and employs a custom user ID system.

Key services include:
- **UserService**: User and profile management.
- **WalletService**: Financial transactions, multi-currency support, and balance management.
- **OrderService**: E-commerce order processing.
- **CommunicationService**: Real-time messaging and calls.
- **CommissionService**: Automated commission calculations.
- **DynamicPaymentService**: Payment link generation and processing.
- **BadgeGeneratorService**: Taxi-moto badge lifecycle management.
- **TransactionFeeService**: Multi-currency fee calculation with DB-backed exchange rates.

The database schema comprises over 54 tables covering user management, e-commerce, financial operations, logistics, syndicate management, agent systems, and communication. Security is paramount, enforced through RLS, audit logging, rate limiting, and SQL injection protection.

## System Design Choices
- **UI/UX**: Focus on accessible components and a custom design system for a consistent user experience.
- **Performance**: Lazy loading for pages and custom hooks for business logic reuse.
- **Security**: Robust RLS, audit logging, and secure authentication mechanisms.
- **Scalability**: Modular service-oriented architecture designed for future expansion.

# External Dependencies

## Cloud Infrastructure
- **Google Cloud Platform (GCP)**: Used for Cloud Storage (file uploads), Firestore (NoSQL data), Cloud Functions (serverless operations), and Maps API (geolocation).

## Database & Backend Services
- **Supabase PostgreSQL**: Primary database with real-time subscriptions, storage, and Edge Functions.

## Communication Services
- **Agora.io**: Integrated for Real-Time Messaging (RTM) and Real-Time Communication (RTC) for audio/video calls, secured with token-based authentication.

## AI/ML Services
- **OpenAI API**: Powers the AI Copilot assistant.
- AI-driven features for fraud detection and analytics are planned.

## Payment Integrations
- **PayPal API**: For international payments.
- **Stripe**: For card processing.
- **Mobile Money**: Local payment integrations (e.g., Orange Money, MTN).
- Custom in-app wallet system with commission fees.

## Mobile Services
- **Firebase Cloud Messaging (FCM)**: For push notifications.
- **Firebase Auth**: For mobile authentication.
- React Native: For cross-platform mobile application development.

## Geolocation
- **Mapbox API**: For maps and tracking functionalities.
- **Google Maps API**: Integrated for location services.
- Real-time GPS tracking.

## Email/SMS
- **Nodemailer**: For email notifications, supporting multiple SMTP providers.
- SMS integration for notifications (pending configuration).