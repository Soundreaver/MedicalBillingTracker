# Hospital Billing Management System

## Overview

This is a full-stack hospital billing management system built with React, Express.js, and PostgreSQL. The application provides comprehensive features for managing patients, medicines, rooms, invoices, and payments in a medical facility. It uses modern web technologies including Vite for frontend bundling, Drizzle ORM for database operations, and shadcn/ui for the component library.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom medical-themed color palette
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (configured for Neon serverless)
- **Session Management**: Connect-pg-simple for PostgreSQL-based sessions
- **Development**: TSX for TypeScript execution in development

### Database Design
The system uses a PostgreSQL database with the following main entities:
- **Patients**: Core patient information with unique patient IDs
- **Medicines**: Inventory management with stock tracking and low-stock alerts
- **Rooms**: Room management with occupancy tracking and daily rates
- **Invoices**: Billing system with line items and payment tracking
- **Payments**: Payment records linked to invoices with multiple payment methods

## Key Components

### Patient Management
- Patient registration and profile management
- Unique patient ID generation and tracking
- Contact information and address management
- Invoice history tracking per patient

### Inventory Management
- Medicine catalog with categorization
- Stock quantity tracking with automatic low-stock alerts
- Unit pricing and bulk inventory management
- Critical stock level monitoring

### Room Management
- Room type classification (private, shared, ICU, etc.)
- Occupancy status tracking
- Daily rate management
- Patient assignment to rooms

### Billing System
- Comprehensive invoice generation with line items
- Multiple item types: medicines, room charges, services
- Payment tracking with partial payment support
- Invoice status management (pending, paid, overdue)
- PDF invoice generation for printing

### Payment Processing
- Multiple payment method support (cash, card, bank transfer, insurance)
- Payment history and reconciliation
- Outstanding balance tracking
- Payment reference management

### Admin Settings
- Medicine categories management with descriptions
- Room types configuration with base pricing
- Direct medicine creation from admin panel
- Direct room creation from admin panel
- Centralized system configuration interface

## Data Flow

1. **Patient Registration**: New patients are registered with unique IDs and stored in the patients table
2. **Service Provision**: Medical services, room assignments, and medicine dispensing are recorded
3. **Invoice Generation**: Services are compiled into invoices with detailed line items
4. **Payment Processing**: Payments are recorded against invoices, updating outstanding balances
5. **Reporting**: Dashboard provides real-time statistics and alerts for business operations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form handling with validation
- **zod**: Runtime type validation and schema definition
- **jspdf**: Client-side PDF generation for invoices

### UI Dependencies
- **@radix-ui/***: Headless UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library for consistent iconography
- **class-variance-authority**: Type-safe CSS class variants
- **cmdk**: Command palette component

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast bundling for production builds

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with Replit modules
- **Database**: PostgreSQL 16 module
- **Development Server**: Vite dev server on port 5000
- **Hot Reload**: Enabled for both frontend and backend

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Database**: Uses environment variable `DATABASE_URL` for connection
- **Deployment**: Configured for Replit autoscale deployment

### Environment Configuration
- **Development**: Uses TSX for direct TypeScript execution
- **Production**: Compiled JavaScript with NODE_ENV=production
- **Database Migrations**: Drizzle Kit for schema management
- **Static Assets**: Served from `dist/public` in production

## Changelog

- June 27, 2025. Initial setup
- June 27, 2025. Added comprehensive admin settings page with medicine categories, room types configuration, and direct creation interfaces
- June 27, 2025. Fixed room checkout cancellation bug - payment modal now properly separates cancel vs payment completion actions
- June 27, 2025. Removed duplicate X buttons from all modals by removing manual close buttons since DialogContent provides them automatically
- June 27, 2025. Simplified room creation by removing redundant daily rate field since room types already define pricing
- June 29, 2025. Added buy price field to medicines with profit calculation replacing critical items card on dashboard
- June 29, 2025. Implemented actions dropdown menu in medicine inventory with view, edit, and delete options
- June 29, 2025. Created comprehensive patient editing modal with patient info and document management (reports, x-rays, etc.)
- June 29, 2025. Transformed room assignment system from fixed stay duration to accumulating daily rate that updates invoices over time
- June 29, 2025. Implemented working delete functionality for medicines with proper server-side route and database storage method
- June 29, 2025. Replaced critical items card in medicine inventory with profit card that calculates actual profit from medicine sales in invoices
- June 29, 2025. Fixed invoice payment display bug by adding paidAmount field to InvoiceWithDetails type and storage methods
- June 29, 2025. Fixed room assignment validation errors by updating room schema to properly handle checkInDate timestamp transformations
- June 29, 2025. Fixed invoice creation error for room assignments by handling empty invoice items array in createInvoice method
- June 29, 2025. Restored payment modal functionality for room checkout to handle outstanding invoices properly
- June 29, 2025. Implemented daily room charge processing system with manual trigger button on dashboard for testing
- June 29, 2025. Enhanced daily charge processing with automatic updates - room charges now update automatically when viewing invoices, plus manual trigger available
- June 29, 2025. Added invoice-specific room charge updates with API endpoint for targeted processing and intelligent dashboard button that shows occupied room count
- June 29, 2025. Removed Quick Actions card from dashboard for cleaner interface and removed redundant Payments tab from navigation
- June 29, 2025. Added invoice-specific manual room charge processing button in billing page for room assignment invoices with Clock icon and purple styling
- June 30, 2025. Implemented comprehensive medical services system from sample invoice with 27 standardized hospital services including admission fee (600 BDT fixed)
- June 30, 2025. Added medical services to invoice creation and room assignment workflows with automatic admission fee inclusion and service selection interface
- June 30, 2025. Created medical services database table and API endpoints with seeded data from Mirror Hospital sample invoice covering all standard medical procedures
- June 30, 2025. Implemented 20% service charge calculation on total payable amount with automatic calculation on server-side for all invoices
- June 30, 2025. Updated invoice schema with subtotal, service charge, and total amount fields plus automatic calculation in create/update operations
- June 30, 2025. Enhanced invoice creation and room assignment modals to display subtotal, 20% service charge, and final total with clear breakdown
- June 30, 2025. Removed price specifications from medical services to allow users/admins to set their own pricing as requested
- June 30, 2025. Completed full pricing flexibility implementation - medical services in room assignment modal and create invoice modal now use user-defined pricing (defaultPrice set to 0.00)
- June 30, 2025. Enhanced edit invoice modal with complete medical services support including user-defined pricing, proper item type selection, and editable price fields for all medical services
- June 30, 2025. Clarified charge types across all modals - room charges are daily accumulating rates, while medical services and medicines are one-time charges during admission/room assignment
- June 30, 2025. Updated UI text throughout to remove "per" language and clearly distinguish one-time charges from daily room rates with descriptive labels and help text
- June 30, 2025. Fixed duplicate close buttons in invoice view and edit invoice modals by removing manual X buttons since DialogContent provides them automatically
- June 30, 2025. Enhanced room assignment modal to filter out patients already assigned to rooms with proper availability checking and helpful messaging when no patients are available
- June 30, 2025. Fixed room assignment invoice calculation by adding initial room charge (1 day) as invoice item - now correctly includes admission fee + room daily rate + services + medicines
- June 30, 2025. Updated cost summary in room assignment to clearly show initial room charge and clarify that additional charges accumulate daily

## User Preferences

Preferred communication style: Simple, everyday language.