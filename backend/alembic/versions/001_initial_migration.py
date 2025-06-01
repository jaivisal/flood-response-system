"""Initial migration with enhanced PostGIS support

Revision ID: 001_initial_migration
Revises: 
Create Date: 2024-12-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_initial_migration'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable PostGIS extension (with error handling for existing extension)
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis_topology')
    
    # Create enum types with explicit checks
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('field_responder', 'command_center', 'district_officer', 'admin');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE incidenttype AS ENUM ('flood', 'rescue_needed', 'infrastructure_damage', 'road_closure', 'power_outage', 'water_contamination', 'evacuation_required', 'medical_emergency', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE severitylevel AS ENUM ('low', 'medium', 'high', 'critical');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE incidentstatus AS ENUM ('reported', 'assigned', 'in_progress', 'resolved', 'closed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE unittype AS ENUM ('fire_rescue', 'medical', 'water_rescue', 'evacuation', 'search_rescue', 'police', 'emergency_services', 'volunteer');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE unitstatus AS ENUM ('available', 'busy', 'en_route', 'on_scene', 'offline', 'maintenance');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE risklevel AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high', 'extreme');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE zonetype AS ENUM ('residential', 'commercial', 'industrial', 'agricultural', 'natural', 'mixed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', postgresql.ENUM('field_responder', 'command_center', 'district_officer', 'admin', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'])
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create flood_zones table
    op.create_table(
        'flood_zones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('zone_code', sa.String(), nullable=False),
        sa.Column('risk_level', postgresql.ENUM('very_low', 'low', 'medium', 'high', 'very_high', 'extreme', name='risklevel'), nullable=False),
        sa.Column('zone_type', postgresql.ENUM('residential', 'commercial', 'industrial', 'agricultural', 'natural', 'mixed', name='zonetype'), nullable=False),
        sa.Column('zone_boundary', geoalchemy2.Geography('POLYGON', srid=4326), nullable=True),
        sa.Column('center_point', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('center_latitude', sa.Float(), nullable=True),
        sa.Column('center_longitude', sa.Float(), nullable=True),
        sa.Column('area_sqkm', sa.Float(), nullable=True),
        sa.Column('population_estimate', sa.Integer(), server_default=sa.text('0')),
        sa.Column('residential_units', sa.Integer(), server_default=sa.text('0')),
        sa.Column('commercial_units', sa.Integer(), server_default=sa.text('0')),
        sa.Column('critical_infrastructure', sa.Text(), nullable=True),
        sa.Column('last_major_flood', sa.DateTime(timezone=True), nullable=True),
        sa.Column('flood_frequency_years', sa.Integer(), nullable=True),
        sa.Column('max_recorded_water_level', sa.Float(), nullable=True),
        sa.Column('current_water_level', sa.Float(), nullable=True),
        sa.Column('is_currently_flooded', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('evacuation_recommended', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('evacuation_mandatory', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('district', sa.String(), nullable=True),
        sa.Column('municipality', sa.String(), nullable=True),
        sa.Column('responsible_officer', sa.String(), nullable=True),
        sa.Column('emergency_contact', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_assessment', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flood_zones_id'), 'flood_zones', ['id'])
    op.create_index(op.f('ix_flood_zones_zone_code'), 'flood_zones', ['zone_code'], unique=True)
    
    # Create spatial index for zone_boundary
    op.execute('CREATE INDEX IF NOT EXISTS idx_flood_zones_zone_boundary ON flood_zones USING GIST (zone_boundary)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_flood_zones_center_point ON flood_zones USING GIST (center_point)')
    
    # Create rescue_units table
    op.create_table(
        'rescue_units',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('unit_name', sa.String(), nullable=False),
        sa.Column('call_sign', sa.String(), nullable=True),
        sa.Column('unit_type', postgresql.ENUM('fire_rescue', 'medical', 'water_rescue', 'evacuation', 'search_rescue', 'police', 'emergency_services', 'volunteer', name='unittype'), nullable=False),
        sa.Column('status', postgresql.ENUM('available', 'busy', 'en_route', 'on_scene', 'offline', 'maintenance', name='unitstatus'), nullable=False),
        sa.Column('location', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('base_location', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('current_address', sa.String(), nullable=True),
        sa.Column('capacity', sa.Integer(), server_default=sa.text('4')),
        sa.Column('equipment', sa.Text(), nullable=True),
        sa.Column('contact_number', sa.String(), nullable=True),
        sa.Column('radio_frequency', sa.String(), nullable=True),
        sa.Column('team_leader', sa.String(), nullable=True),
        sa.Column('team_size', sa.Integer(), server_default=sa.text('2')),
        sa.Column('fuel_level', sa.Float(), nullable=True),
        sa.Column('last_maintenance', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_maintenance', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_location_update', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rescue_units_id'), 'rescue_units', ['id'])
    op.create_index(op.f('ix_rescue_units_unit_name'), 'rescue_units', ['unit_name'], unique=True)
    
    # Create spatial indexes for rescue units
    op.execute('CREATE INDEX IF NOT EXISTS idx_rescue_units_location ON rescue_units USING GIST (location)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_rescue_units_base_location ON rescue_units USING GIST (base_location)')
    
    # Create incidents table
    op.create_table(
        'incidents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('incident_type', postgresql.ENUM('flood', 'rescue_needed', 'infrastructure_damage', 'road_closure', 'power_outage', 'water_contamination', 'evacuation_required', 'medical_emergency', 'other', name='incidenttype'), nullable=False),
        sa.Column('severity', postgresql.ENUM('low', 'medium', 'high', 'critical', name='severitylevel'), nullable=False),
        sa.Column('status', postgresql.ENUM('reported', 'assigned', 'in_progress', 'resolved', 'closed', name='incidentstatus'), nullable=False),
        sa.Column('location', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('landmark', sa.String(), nullable=True),
        sa.Column('affected_people_count', sa.Integer(), server_default=sa.text('0')),
        sa.Column('water_level', sa.Float(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('additional_images', sa.Text(), nullable=True),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('assigned_unit_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_unit_id'], ['rescue_units.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incidents_id'), 'incidents', ['id'])
    op.create_index('idx_incidents_severity', 'incidents', ['severity'])
    op.create_index('idx_incidents_status', 'incidents', ['status'])
    op.create_index('idx_incidents_created_at', 'incidents', ['created_at'])
    op.create_index('idx_incidents_incident_type', 'incidents', ['incident_type'])
    
    # Create spatial index for incidents location
    op.execute('CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location)')
    
    # Create update triggers for updated_at columns
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    
    # Add triggers to tables
    op.execute("""
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        CREATE TRIGGER update_flood_zones_updated_at 
        BEFORE UPDATE ON flood_zones 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        CREATE TRIGGER update_rescue_units_updated_at 
        BEFORE UPDATE ON rescue_units 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        CREATE TRIGGER update_incidents_updated_at 
        BEFORE UPDATE ON incidents 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    
    # Insert demo data
    # Demo users
    op.execute("""
        INSERT INTO users (email, full_name, hashed_password, role, phone_number, department, is_active, is_verified)
        VALUES 
        ('responder@demo.com', 'John Field Responder', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGP6w9U5F6O', 'field_responder', '+91-9876543210', 'Emergency Response Team Alpha', true, true),
        ('command@demo.com', 'Sarah Command Center', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGP6w9U5F6O', 'command_center', '+91-9876543211', 'Emergency Command Center', true, true),
        ('officer@demo.com', 'Dr. Kumar District Officer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGP6w9U5F6O', 'district_officer', '+91-9876543212', 'Madurai District Office', true, true),
        ('admin@demo.com', 'Admin User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGP6w9U5F6O', 'admin', '+91-9876543213', 'System Administration', true, true)
        ON CONFLICT (email) DO NOTHING;
    """)
    
    # Demo flood zones (using Madurai coordinates)
    op.execute("""
        INSERT INTO flood_zones (
            name, description, zone_code, risk_level, zone_type, 
            center_point, center_latitude, center_longitude, area_sqkm, population_estimate, 
            residential_units, commercial_units, district, municipality,
            responsible_officer, emergency_contact
        ) VALUES 
        (
            'Vaigai River Basin - North', 
            'Northern section of Vaigai river basin with high flood risk during monsoon',
            'VRB-N-001', 
            'high', 
            'residential',
            ST_GeogFromText('POINT(78.1198 9.9252)'),
            9.9252,
            78.1198,
            15.5,
            25000,
            5000,
            200,
            'Madurai',
            'Madurai Corporation',
            'Dr. Kumar Selvam',
            '+91-9876543210'
        ),
        (
            'Central Commercial District',
            'Main commercial area prone to waterlogging',
            'CCD-001',
            'medium',
            'commercial',
            ST_GeogFromText('POINT(78.1278 9.9195)'),
            9.9195,
            78.1278,
            8.2,
            15000,
            2000,
            800,
            'Madurai',
            'Madurai Corporation',
            'Mrs. Priya Nair',
            '+91-9876543211'
        ),
        (
            'Meenakshi Temple Area',
            'Heritage zone requiring special flood protection measures',
            'MTA-001',
            'very_high',
            'mixed',
            ST_GeogFromText('POINT(78.1196 9.9195)'),
            9.9195,
            78.1196,
            3.7,
            8000,
            1200,
            300,
            'Madurai',
            'Madurai Corporation',
            'Dr. Arjun Kumar',
            '+91-9876543212'
        )
        ON CONFLICT (zone_code) DO NOTHING;
    """)
    
    # Demo rescue units
    op.execute("""
        INSERT INTO rescue_units (
            unit_name, call_sign, unit_type, status, location, base_location,
            current_address, capacity, team_leader, team_size, contact_number,
            radio_frequency, fuel_level
        ) VALUES 
        (
            'Fire Rescue Alpha-1',
            'FR-A1',
            'fire_rescue',
            'available',
            ST_GeogFromText('POINT(78.1150 9.9300)'),
            ST_GeogFromText('POINT(78.1150 9.9300)'),
            'Fire Station 1, Anna Nagar, Madurai',
            6,
            'Captain Rajesh Kumar',
            4,
            '+91-9876001001',
            '156.800',
            85.0
        ),
        (
            'Medical Emergency Unit-1',
            'MED-1',
            'medical',
            'available',
            ST_GeogFromText('POINT(78.1200 9.9250)'),
            ST_GeogFromText('POINT(78.1200 9.9250)'),
            'Government Hospital, Madurai',
            4,
            'Dr. Priya Sharma',
            3,
            '+91-9876001002',
            '156.900',
            90.0
        ),
        (
            'Water Rescue Boat-1',
            'WR-B1',
            'water_rescue',
            'busy',
            ST_GeogFromText('POINT(78.1100 9.9180)'),
            ST_GeogFromText('POINT(78.1180 9.9200)'),
            'Vaigai River Dock, Madurai',
            8,
            'Lieutenant Suresh',
            5,
            '+91-9876001003',
            '157.000',
            70.0
        ),
        (
            'Police Patrol Unit-5',
            'PP-5',
            'police',
            'en_route',
            ST_GeogFromText('POINT(78.1250 9.9100)'),
            ST_GeogFromText('POINT(78.1280 9.9150)'),
            'Police Station Central, Madurai',
            4,
            'Inspector Vijay',
            2,
            '+91-9876001004',
            '156.700',
            75.0
        )
        ON CONFLICT (unit_name) DO NOTHING;
    """)
    
    # Demo incidents
    op.execute("""
        INSERT INTO incidents (
            title, description, incident_type, severity, status, location,
            address, landmark, affected_people_count, water_level, reporter_id
        ) VALUES 
        (
            'Severe flooding in residential area',
            'Multiple houses affected by rising water levels due to blocked drainage',
            'flood',
            'high',
            'reported',
            ST_GeogFromText('POINT(78.1180 9.9220)'),
            'Sellur Main Road, Madurai',
            'Near Sellur Murugan Temple',
            15,
            1.5,
            1
        ),
        (
            'Family stranded on rooftop',
            'Elderly family unable to evacuate from flooded house',
            'rescue_needed',
            'critical',
            'assigned',
            ST_GeogFromText('POINT(78.1120 9.9180)'),
            'Krishnan Koil Street, Madurai',
            'Behind Government School',
            4,
            2.1,
            2
        ),
        (
            'Road closure due to waterlogging',
            'Main connecting road blocked, traffic diverted',
            'road_closure',
            'medium',
            'in_progress',
            ST_GeogFromText('POINT(78.1300 9.9150)'),
            'Bypass Road, Madurai',
            'Near TVS Signal',
            0,
            0.8,
            1
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # Update incidents with assigned units
    op.execute("""
        UPDATE incidents 
        SET assigned_unit_id = 3 
        WHERE title = 'Family stranded on rooftop';
    """)
    
    print("✅ Migration completed successfully!")


def downgrade() -> None:
    # Drop triggers first
    op.execute("DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents")
    op.execute("DROP TRIGGER IF EXISTS update_rescue_units_updated_at ON rescue_units")
    op.execute("DROP TRIGGER IF EXISTS update_flood_zones_updated_at ON flood_zones")
    op.execute("DROP TRIGGER IF EXISTS update_users_updated_at ON users")
    
    # Drop function
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('incidents')
    op.drop_table('rescue_units')
    op.drop_table('flood_zones')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS zonetype")
    op.execute("DROP TYPE IF EXISTS risklevel")
    op.execute("DROP TYPE IF EXISTS unitstatus")
    op.execute("DROP TYPE IF EXISTS unittype")
    op.execute("DROP TYPE IF EXISTS incidentstatus")
    op.execute("DROP TYPE IF EXISTS severitylevel")
    op.execute("DROP TYPE IF EXISTS incidenttype")
    op.execute("DROP TYPE IF EXISTS userrole")
    
    print("✅ Downgrade completed successfully!")