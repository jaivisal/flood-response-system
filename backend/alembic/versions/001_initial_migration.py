"""Initial migration

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
    # Enable PostGIS extension
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    
    # Create enum types
    op.execute("CREATE TYPE userrole AS ENUM ('field_responder', 'command_center', 'district_officer', 'admin')")
    op.execute("CREATE TYPE incidenttype AS ENUM ('flood', 'rescue_needed', 'infrastructure_damage', 'road_closure', 'power_outage', 'water_contamination', 'evacuation_required', 'medical_emergency', 'other')")
    op.execute("CREATE TYPE severitylevel AS ENUM ('low', 'medium', 'high', 'critical')")
    op.execute("CREATE TYPE incidentstatus AS ENUM ('reported', 'assigned', 'in_progress', 'resolved', 'closed')")
    op.execute("CREATE TYPE unittype AS ENUM ('fire_rescue', 'medical', 'water_rescue', 'evacuation', 'search_rescue', 'police', 'emergency_services', 'volunteer')")
    op.execute("CREATE TYPE unitstatus AS ENUM ('available', 'busy', 'en_route', 'on_scene', 'offline', 'maintenance')")
    op.execute("CREATE TYPE risklevel AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high', 'extreme')")
    op.execute("CREATE TYPE zonetype AS ENUM ('residential', 'commercial', 'industrial', 'agricultural', 'natural', 'mixed')")
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', postgresql.ENUM('field_responder', 'command_center', 'district_officer', 'admin', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
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
        sa.Column('zone_boundary', geoalchemy2.Geography('POLYGON', srid=4326), nullable=False),
        sa.Column('center_point', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('area_sqkm', sa.Float(), nullable=True),
        sa.Column('population_estimate', sa.Integer(), default=0),
        sa.Column('residential_units', sa.Integer(), default=0),
        sa.Column('commercial_units', sa.Integer(), default=0),
        sa.Column('critical_infrastructure', sa.Text(), nullable=True),
        sa.Column('last_major_flood', sa.DateTime(timezone=True), nullable=True),
        sa.Column('flood_frequency_years', sa.Integer(), nullable=True),
        sa.Column('max_recorded_water_level', sa.Float(), nullable=True),
        sa.Column('current_water_level', sa.Float(), nullable=True),
        sa.Column('is_currently_flooded', sa.Boolean(), default=False),
        sa.Column('evacuation_recommended', sa.Boolean(), default=False),
        sa.Column('evacuation_mandatory', sa.Boolean(), default=False),
        sa.Column('district', sa.String(), nullable=True),
        sa.Column('municipality', sa.String(), nullable=True),
        sa.Column('responsible_officer', sa.String(), nullable=True),
        sa.Column('emergency_contact', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('last_assessment', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flood_zones_id'), 'flood_zones', ['id'])
    op.create_index(op.f('ix_flood_zones_zone_code'), 'flood_zones', ['zone_code'], unique=True)
    op.create_index('idx_flood_zones_zone_boundary', 'flood_zones', ['zone_boundary'], postgresql_using='gist')
    
    # Create rescue_units table
    op.create_table(
        'rescue_units',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('unit_name', sa.String(), nullable=False),
        sa.Column('call_sign', sa.String(), nullable=True),
        sa.Column('unit_type', postgresql.ENUM('fire_rescue', 'medical', 'water_rescue', 'evacuation', 'search_rescue', 'police', 'emergency_services', 'volunteer', name='unittype'), nullable=False),
        sa.Column('status', postgresql.ENUM('available', 'busy', 'en_route', 'on_scene', 'offline', 'maintenance', name='unitstatus'), nullable=False),
        sa.Column('location', geoalchemy2.Geography('POINT', srid=4326), nullable=False),
        sa.Column('base_location', geoalchemy2.Geography('POINT', srid=4326), nullable=True),
        sa.Column('current_address', sa.String(), nullable=True),
        sa.Column('capacity', sa.Integer(), default=4),
        sa.Column('equipment', sa.Text(), nullable=True),
        sa.Column('contact_number', sa.String(), nullable=True),
        sa.Column('radio_frequency', sa.String(), nullable=True),
        sa.Column('team_leader', sa.String(), nullable=True),
        sa.Column('team_size', sa.Integer(), default=2),
        sa.Column('fuel_level', sa.Float(), nullable=True),
        sa.Column('last_maintenance', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_maintenance', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('last_location_update', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rescue_units_id'), 'rescue_units', ['id'])
    op.create_index(op.f('ix_rescue_units_unit_name'), 'rescue_units', ['unit_name'], unique=True)
    op.create_index('idx_rescue_units_location', 'rescue_units', ['location'], postgresql_using='gist')
    
    # Create incidents table
    op.create_table(
        'incidents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('incident_type', postgresql.ENUM('flood', 'rescue_needed', 'infrastructure_damage', 'road_closure', 'power_outage', 'water_contamination', 'evacuation_required', 'medical_emergency', 'other', name='incidenttype'), nullable=False),
        sa.Column('severity', postgresql.ENUM('low', 'medium', 'high', 'critical', name='severitylevel'), nullable=False),
        sa.Column('status', postgresql.ENUM('reported', 'assigned', 'in_progress', 'resolved', 'closed', name='incidentstatus'), nullable=False),
        sa.Column('location', geoalchemy2.Geography('POINT', srid=4326), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('landmark', sa.String(), nullable=True),
        sa.Column('affected_people_count', sa.Integer(), default=0),
        sa.Column('water_level', sa.Float(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('additional_images', sa.Text(), nullable=True),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('assigned_unit_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_unit_id'], ['rescue_units.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incidents_id'), 'incidents', ['id'])
    op.create_index('idx_incidents_location', 'incidents', ['location'], postgresql_using='gist')
    op.create_index('idx_incidents_severity', 'incidents', ['severity'])
    op.create_index('idx_incidents_status', 'incidents', ['status'])
    op.create_index('idx_incidents_created_at', 'incidents', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
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
