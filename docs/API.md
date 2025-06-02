🔌 API Architecture
RESTful API Design
Authentication Endpoints
httpPOST   /auth/login-json          # User login
GET    /auth/me                  # Get current user
GET    /auth/logout              # User logout
POST   /auth/change-password     # Change password
POST   /auth/refresh-token       # Refresh JWT token
Incident Management Endpoints
httpGET    /incidents/               # List incidents
POST   /incidents/               # Create incident
GET    /incidents/{id}           # Get incident details
PUT    /incidents/{id}           # Update incident
DELETE /incidents/{id}           # Delete incident
GET    /incidents/stats/overview # Get incident statistics
POST   /incidents/nearby         # Find nearby incidents
GET    /incidents/geojson/all    # Get incidents as GeoJSON
Rescue Unit Management Endpoints
httpGET    /rescue-units/            # List rescue units
POST   /rescue-units/            # Create rescue unit
GET    /rescue-units/{id}        # Get unit details
PUT    /rescue-units/{id}        # Update unit
DELETE /rescue-units/{id}        # Delete unit
PUT    /rescue-units/{id}/location # Update unit location
PUT    /rescue-units/{id}/status   # Update unit status
POST   /rescue-units/nearby      # Find nearby units
GET    /rescue-units/stats/overview # Get unit statistics
Flood Zone Management Endpoints
httpGET    /floodzones/              # List flood zones
POST   /floodzones/              # Create flood zone
GET    /floodzones/{id}          # Get zone details
PUT    /floodzones/{id}          # Update zone
DELETE /floodzones/{id}          # Delete zone
GET    /floodzones/stats/overview # Get zone statistics
API Response Standards
Success Response Format
json{
  "data": {
    "id": 1,
    "title": "Flood incident",
    "severity": "high",
    "status": "reported"
  },
  "status": "success",
  "message": "Incident created successfully"
}
Error Response Format
json{
  "detail": "Validation error",
  "errors": [
    {
      "loc": ["body", "title"],
      "msg": "Field required",
      "type": "missing"
    }
  ],
  "status_code": 422
}
Pagination Response Format
json{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "pages": 5
}

🔒 Security Implementation
Authentication & Authorization
JWT Token Structure
json{
  "sub": "user@example.com",
  "user_id": 123,
  "role": "field_responder",
  "exp": 1640995200,
  "iat": 1640908800
}
Role-Based Access Control (RBAC)
pythonclass UserRole(str, enum.Enum):
    FIELD_RESPONDER = "field_responder"
    COMMAND_CENTER = "command_center"
    DISTRICT_OFFICER = "district_officer"
    ADMIN = "admin"

# Permission matrix
PERMISSIONS = {
    "field_responder": ["create_incident", "update_own_incident"],
    "command_center": ["view_all_incidents", "assign_units", "manage_units"],
    "district_officer": ["manage_flood_zones", "view_analytics"],
    "admin": ["manage_users", "system_config", "all_permissions"]
}
Data Protection Measures
Password Security

bcrypt Hashing: Industry-standard password hashing
Salt Rounds: 12 rounds for optimal security/performance balance
Password Policies: Minimum length and complexity requirements

Input Validation

Pydantic Schemas: Comprehensive data validation
SQL Injection Prevention: Parameterized queries through SQLAlchemy
XSS Protection: Input sanitization and output encoding

API Security
python# Rate limiting configuration
@limiter.limit("5 per minute")
async def login_endpoint():
    pass

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)