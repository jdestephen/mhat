"""split_doctor_access_level_enum_and_normalize_uppercase

Revision ID: f1a2b3c4d5e6
Revises: cd80d39bc593
Create Date: 2026-02-10 16:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'cd80d39bc593'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    1. Create a separate 'doctoraccesslevel' enum for doctor-patient access.
    2. Migrate doctor_patient_access and access_invitations columns to it.
    3. Normalize ALL enum values in the DB from lowercase to UPPERCASE.
    """
    # === 1. Create new doctoraccesslevel enum and migrate columns ===
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE doctoraccesslevel AS ENUM ('READ_ONLY', 'WRITE');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        ALTER TABLE doctor_patient_access 
        ALTER COLUMN access_level TYPE doctoraccesslevel 
        USING access_level::text::doctoraccesslevel;
    """)

    op.execute("""
        ALTER TABLE access_invitations 
        ALTER COLUMN access_level TYPE doctoraccesslevel 
        USING access_level::text::doctoraccesslevel;
    """)

    # === 2. Normalize userrole enum: doctor -> DOCTOR, patient -> PATIENT ===
    op.execute("ALTER TYPE userrole RENAME TO userrole_old;")
    op.execute("CREATE TYPE userrole AS ENUM ('DOCTOR', 'PATIENT');")
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN role TYPE userrole 
        USING UPPER(role::text)::userrole;
    """)
    op.execute("DROP TYPE userrole_old;")

    # === 3. Normalize accesstype enum: permanent -> PERMANENT, temporary -> TEMPORARY ===
    op.execute("ALTER TYPE accesstype RENAME TO accesstype_old;")
    op.execute("CREATE TYPE accesstype AS ENUM ('PERMANENT', 'TEMPORARY');")
    op.execute("""
        ALTER TABLE doctor_patient_access 
        ALTER COLUMN access_type TYPE accesstype 
        USING UPPER(access_type::text)::accesstype;
    """)
    op.execute("""
        ALTER TABLE access_invitations 
        ALTER COLUMN access_type TYPE accesstype 
        USING UPPER(access_type::text)::accesstype;
    """)
    op.execute("DROP TYPE accesstype_old;")

    # === 4. Normalize accesslevel (family) enum ===
    op.execute("ALTER TYPE accesslevel RENAME TO accesslevel_old;")
    op.execute("CREATE TYPE accesslevel AS ENUM ('FULL_ACCESS', 'READ_ONLY', 'EMERGENCY_ONLY');")
    op.execute("""
        ALTER TABLE family_memberships 
        ALTER COLUMN access_level TYPE accesslevel 
        USING UPPER(access_level::text)::accesslevel;
    """)
    op.execute("DROP TYPE accesslevel_old;")

    # === 5. Normalize relationshiptype enum ===
    op.execute("ALTER TYPE relationshiptype RENAME TO relationshiptype_old;")
    op.execute("""
        CREATE TYPE relationshiptype AS ENUM (
            'SELF', 'PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 
            'GRANDPARENT', 'GRANDCHILD', 'GUARDIAN', 'OTHER'
        );
    """)
    op.execute("""
        ALTER TABLE family_memberships 
        ALTER COLUMN relationship_type TYPE relationshiptype 
        USING UPPER(relationship_type::text)::relationshiptype;
    """)
    op.execute("DROP TYPE relationshiptype_old;")

    # === 6. Normalize allergytype enum ===
    op.execute("ALTER TYPE allergytype RENAME TO allergytype_old;")
    op.execute("CREATE TYPE allergytype AS ENUM ('MEDICATION', 'FOOD', 'SUBSTANCE', 'OTHER');")
    op.execute("""
        ALTER TABLE allergies 
        ALTER COLUMN type TYPE allergytype 
        USING UPPER(type::text)::allergytype;
    """)
    op.execute("DROP TYPE allergytype_old;")

    # === 7. Normalize allergyseverity enum ===
    op.execute("ALTER TYPE allergyseverity RENAME TO allergyseverity_old;")
    op.execute("CREATE TYPE allergyseverity AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');")
    op.execute("""
        ALTER TABLE allergies 
        ALTER COLUMN severity TYPE allergyseverity 
        USING UPPER(severity::text)::allergyseverity;
    """)
    op.execute("DROP TYPE allergyseverity_old;")

    # === 8. Normalize allergysource enum ===
    op.execute("ALTER TYPE allergysource RENAME TO allergysource_old;")
    op.execute("CREATE TYPE allergysource AS ENUM ('DOCTOR', 'SUSPECTED', 'NOT_SURE');")
    op.execute("""
        ALTER TABLE allergies 
        ALTER COLUMN source TYPE allergysource 
        USING UPPER(source::text)::allergysource;
    """)
    op.execute("DROP TYPE allergysource_old;")

    # === 9. Normalize allergystatus enum ===
    op.execute("ALTER TYPE allergystatus RENAME TO allergystatus_old;")
    op.execute("CREATE TYPE allergystatus AS ENUM ('UNVERIFIED', 'VERIFIED');")
    op.execute("""
        ALTER TABLE allergies 
        ALTER COLUMN status TYPE allergystatus 
        USING UPPER(status::text)::allergystatus;
    """)
    op.execute("DROP TYPE allergystatus_old;")

    # === 10. Normalize conditionstatus enum ===
    op.execute("ALTER TYPE conditionstatus RENAME TO conditionstatus_old;")
    op.execute("CREATE TYPE conditionstatus AS ENUM ('ACTIVE', 'CONTROLLED', 'RESOLVED', 'UNKNOWN');")
    op.execute("""
        ALTER TABLE conditions 
        ALTER COLUMN status TYPE conditionstatus 
        USING UPPER(status::text)::conditionstatus;
    """)
    op.execute("DROP TYPE conditionstatus_old;")

    # === 11. Normalize conditionsource enum ===
    op.execute("ALTER TYPE conditionsource RENAME TO conditionsource_old;")
    op.execute("CREATE TYPE conditionsource AS ENUM ('DOCTOR', 'SUSPECTED');")
    op.execute("""
        ALTER TABLE conditions 
        ALTER COLUMN source TYPE conditionsource 
        USING UPPER(source::text)::conditionsource;
    """)
    op.execute("DROP TYPE conditionsource_old;")


def downgrade() -> None:
    """Revert all enum values back to lowercase and merge doctor access back."""
    # Revert conditionsource
    op.execute("ALTER TYPE conditionsource RENAME TO conditionsource_old;")
    op.execute("CREATE TYPE conditionsource AS ENUM ('doctor', 'suspected');")
    op.execute("ALTER TABLE conditions ALTER COLUMN source TYPE conditionsource USING LOWER(source::text)::conditionsource;")
    op.execute("DROP TYPE conditionsource_old;")

    # Revert conditionstatus
    op.execute("ALTER TYPE conditionstatus RENAME TO conditionstatus_old;")
    op.execute("CREATE TYPE conditionstatus AS ENUM ('active', 'controlled', 'resolved', 'unknown');")
    op.execute("ALTER TABLE conditions ALTER COLUMN status TYPE conditionstatus USING LOWER(status::text)::conditionstatus;")
    op.execute("DROP TYPE conditionstatus_old;")

    # Revert allergystatus
    op.execute("ALTER TYPE allergystatus RENAME TO allergystatus_old;")
    op.execute("CREATE TYPE allergystatus AS ENUM ('unverified', 'verified');")
    op.execute("ALTER TABLE allergies ALTER COLUMN status TYPE allergystatus USING LOWER(status::text)::allergystatus;")
    op.execute("DROP TYPE allergystatus_old;")

    # Revert allergysource
    op.execute("ALTER TYPE allergysource RENAME TO allergysource_old;")
    op.execute("CREATE TYPE allergysource AS ENUM ('doctor', 'suspected', 'not_sure');")
    op.execute("ALTER TABLE allergies ALTER COLUMN source TYPE allergysource USING LOWER(source::text)::allergysource;")
    op.execute("DROP TYPE allergysource_old;")

    # Revert allergyseverity
    op.execute("ALTER TYPE allergyseverity RENAME TO allergyseverity_old;")
    op.execute("CREATE TYPE allergyseverity AS ENUM ('mild', 'moderate', 'severe', 'unknown');")
    op.execute("ALTER TABLE allergies ALTER COLUMN severity TYPE allergyseverity USING LOWER(severity::text)::allergyseverity;")
    op.execute("DROP TYPE allergyseverity_old;")

    # Revert allergytype
    op.execute("ALTER TYPE allergytype RENAME TO allergytype_old;")
    op.execute("CREATE TYPE allergytype AS ENUM ('medication', 'food', 'substance', 'other');")
    op.execute("ALTER TABLE allergies ALTER COLUMN type TYPE allergytype USING LOWER(type::text)::allergytype;")
    op.execute("DROP TYPE allergytype_old;")

    # Revert relationshiptype
    op.execute("ALTER TYPE relationshiptype RENAME TO relationshiptype_old;")
    op.execute("CREATE TYPE relationshiptype AS ENUM ('self', 'parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'guardian', 'other');")
    op.execute("ALTER TABLE family_memberships ALTER COLUMN relationship_type TYPE relationshiptype USING LOWER(relationship_type::text)::relationshiptype;")
    op.execute("DROP TYPE relationshiptype_old;")

    # Revert accesslevel (family)
    op.execute("ALTER TYPE accesslevel RENAME TO accesslevel_old;")
    op.execute("CREATE TYPE accesslevel AS ENUM ('full_access', 'read_only', 'emergency_only');")
    op.execute("ALTER TABLE family_memberships ALTER COLUMN access_level TYPE accesslevel USING LOWER(access_level::text)::accesslevel;")
    op.execute("DROP TYPE accesslevel_old;")

    # Revert accesstype
    op.execute("ALTER TYPE accesstype RENAME TO accesstype_old;")
    op.execute("CREATE TYPE accesstype AS ENUM ('permanent', 'temporary');")
    op.execute("ALTER TABLE doctor_patient_access ALTER COLUMN access_type TYPE accesstype USING LOWER(access_type::text)::accesstype;")
    op.execute("ALTER TABLE access_invitations ALTER COLUMN access_type TYPE accesstype USING LOWER(access_type::text)::accesstype;")
    op.execute("DROP TYPE accesstype_old;")

    # Revert userrole
    op.execute("ALTER TYPE userrole RENAME TO userrole_old;")
    op.execute("CREATE TYPE userrole AS ENUM ('doctor', 'patient');")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING LOWER(role::text)::userrole;")
    op.execute("DROP TYPE userrole_old;")

    # Revert doctor_patient_access and access_invitations back to shared accesslevel
    op.execute("ALTER TABLE doctor_patient_access ALTER COLUMN access_level TYPE accesslevel USING access_level::text::accesslevel;")
    op.execute("ALTER TABLE access_invitations ALTER COLUMN access_level TYPE accesslevel USING access_level::text::accesslevel;")
    op.execute("DROP TYPE IF EXISTS doctoraccesslevel;")
