Emergency Flood Response Management System
Table of Contents

Project Overview
Features
Technology Stack
System Architecture
Getting Started
Demo Accounts
User Roles & Permissions
API Documentation
Database Schema
Development Setup
Testing
Security Features
Performance Optimizations
Deployment
Screenshots
Contributing
Troubleshooting
License

Project Overview
This is a comprehensive web-based emergency management application designed for government officials and NGOs to handle flood emergency situations. The system provides real-time coordination between field responders, command centers, and district officers with integrated GIS capabilities for spatial analysis and visualization.
Developed for: District government emergency management operations
Use Case: Heavy rainfall forecasting and flood emergency response coordination
Users: Field personnel, command center operations, and senior government officials
Features
🚨 Core Emergency Management

Real-time Incident Reporting: GPS-enabled incident creation with photos and detailed information
Interactive GIS Mapping: Multi-layer visualization of incidents, rescue units, and flood zones
Rescue Unit Coordination: Live tracking and management of emergency response teams
Flood Zone Risk Assessment: Monitoring flood-prone areas with risk levels and population data
Role-based Access Control: Hierarchical permissions for different user types

📊 Advanced Analytics

Real-time Dashboard: Live updates with statistics, alerts, and performance metrics
Priority-based Management: Automatic incident prioritization and resource allocation
Performance Tracking: Response time analysis, resolution rates, and operational metrics
Evacuation Management: Coordination of evacuation orders and population displacement

🗺️ GIS Integration

Spatial Analysis: PostGIS-powered geographic data processing
Multi-layer Mapping: Toggle between different data layers (incidents, units, zones)
Proximity Queries: Find nearest rescue units and calculate response times
Geographic Boundaries: Flood zone management with polygon boundaries

Technology Stack
Backend

FastAPI - High-performance Python web framework
PostgreSQL + PostGIS - Spatial database with geographic extensions
SQLAlchemy + GeoAlchemy2 - ORM with spatial data support
JWT Authentication - Secure token-based authentication
Pydantic - Data validation and serialization

Frontend

React 18 - Modern component-based UI framework
TypeScript - Type-safe JavaScript development
React Query - Server state management and caching
Leaflet - Interactive maps with OpenStreetMap
Tailwind CSS - Utility-first CSS framework
Framer Motion - Smooth animations and transitions

Infrastructure

Docker & Docker Compose - Containerized development and deployment
Nginx - Reverse proxy and static file serving
PostgreSQL - Primary database with PostGIS extension

System Architecture
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Dashboard  │ │  Incidents  │ │  Maps & Visualization   │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Rescue Units│ │ Flood Zones │ │  Authentication & Auth  │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ REST API (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Auth      │ │  Incidents  │ │    GIS Services         │ │
│  │  Services   │ │   Manager   │ │   (Spatial Analysis)    │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Rescue Unit │ │ Flood Zone  │ │     API Routes          │ │
│  │  Services   │ │  Services   │ │   (CRUD Operations)     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ SQL + PostGIS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL + PostGIS                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    Users    │ │  Incidents  │ │     Spatial Data        │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │Rescue Units │ │ Flood Zones │ │    Geographic Tables    │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
Getting Started
Prerequisites

Docker 20.10+ and Docker Compose 2.0+
Git for version control
Node.js 18+ (for local development)
Python 3.9+ (for local development)

🚀 Quick Start (Recommended)

Clone the repository

bashgit clone https://github.com/yourusername/emergency-flood-response.git
cd emergency-flood-response

Run the automation script

bashchmod +x start-application.sh
./start-application.sh
What the script does:

Checks for Docker installation
Sets up environment variables
Builds and starts all containers
Initializes database with demo data
Opens the application in your browser