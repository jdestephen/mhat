"""
Family Service

Business logic for managing family accounts and access control.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.family import FamilyMembership, RelationshipType, AccessLevel
from app.models.patient import PatientProfile
from app.models.user import User


class FamilyService:
    """Service for managing family relationships and patient profile access."""
    
    @staticmethod
    def check_access(
        db: Session,
        user_id: UUID,
        patient_profile_id: UUID,
        required_level: AccessLevel = AccessLevel.READ_ONLY
    ) -> bool:
        """
        Check if a user has access to a patient profile.
        
        Args:
            db: Database session
            user_id: ID of the user requesting access
            patient_profile_id: ID of the patient profile
            required_level: Minimum access level required
            
        Returns:
            True if user has access, False otherwise
        """
        # Define access level hierarchy
        access_hierarchy = {
            AccessLevel.EMERGENCY_ONLY: 0,
            AccessLevel.READ_ONLY: 1,
            AccessLevel.FULL_ACCESS: 2
        }
        
        # Check for active family membership
        membership = db.query(FamilyMembership).filter(
            and_(
                FamilyMembership.user_id == user_id,
                FamilyMembership.patient_profile_id == patient_profile_id,
                FamilyMembership.is_active == True
            )
        ).first()
        
        if not membership:
            return False
        
        # Check if user's access level is sufficient
        user_access_level = access_hierarchy.get(membership.access_level, 0)
        required_access_level = access_hierarchy.get(required_level, 0)
        
        return user_access_level >= required_access_level
    
    @staticmethod
    def get_managed_patients(
        db: Session,
        user_id: UUID,
        include_inactive: bool = False
    ) -> List[PatientProfile]:
        """
        Get all patient profiles that a user can manage.
        
        Args:
            db: Database session
            user_id: ID of the user
            include_inactive: Whether to include revoked memberships
            
        Returns:
            List of PatientProfile objects
        """
        query = db.query(PatientProfile).join(
            FamilyMembership,
            PatientProfile.id == FamilyMembership.patient_profile_id
        ).filter(FamilyMembership.user_id == user_id)
        
        if not include_inactive:
            query = query.filter(FamilyMembership.is_active == True)
        
        return query.all()
    
    @staticmethod
    def create_family_member(
        db: Session,
        user_id: UUID,
        first_name: str,
        last_name: str,
        relationship_type: RelationshipType,
        date_of_birth: Optional[datetime] = None,
        blood_type: Optional[str] = None,
        access_level: AccessLevel = AccessLevel.FULL_ACCESS
    ) -> PatientProfile:
        """
        Create a new patient profile for a family member (e.g., child).
        
        Args:
            db: Database session
            user_id: ID of the user creating the profile
            first_name: First name of the family member
            last_name: Last name of the family member
            relationship_type: Type of relationship (e.g., PARENT for child)
            date_of_birth: Optional date of birth
            blood_type: Optional blood type
            access_level: Access level for the user
            
        Returns:
            Created PatientProfile object
        """
        # Create patient profile without user account
        patient_profile = PatientProfile(
            user_id=None,  # No user account for minors
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            blood_type=blood_type
        )
        db.add(patient_profile)
        db.flush()  # Get the patient_profile.id
        
        # Create family membership
        membership = FamilyMembership(
            user_id=user_id,
            patient_profile_id=patient_profile.id,
            relationship_type=relationship_type,
            access_level=access_level,
            can_manage_family=True,
            created_by=user_id,
            is_active=True
        )
        db.add(membership)
        db.commit()
        db.refresh(patient_profile)
        
        return patient_profile
    
    @staticmethod
    def link_patient_to_user(
        db: Session,
        patient_profile_id: UUID,
        user_id: UUID
    ) -> PatientProfile:
        """
        Link an existing patient profile to a user account.
        This is used when a child turns 16+ and creates their own account.
        
        Args:
            db: Database session
            patient_profile_id: ID of the patient profile
            user_id: ID of the user account
            
        Returns:
            Updated PatientProfile object
        """
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.id == patient_profile_id
        ).first()
        
        if not patient_profile:
            raise ValueError("Patient profile not found")
        
        if patient_profile.user_id is not None:
            raise ValueError("Patient profile is already linked to a user")
        
        # Link patient profile to user
        patient_profile.user_id = user_id
        
        # Create self-management membership
        membership = FamilyMembership(
            user_id=user_id,
            patient_profile_id=patient_profile_id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=user_id,
            is_active=True
        )
        db.add(membership)
        db.commit()
        db.refresh(patient_profile)
        
        return patient_profile
    
    @staticmethod
    def add_family_member_access(
        db: Session,
        granter_user_id: UUID,
        grantee_user_id: UUID,
        patient_profile_id: UUID,
        relationship_type: RelationshipType,
        access_level: AccessLevel = AccessLevel.FULL_ACCESS,
        can_manage_family: bool = False
    ) -> FamilyMembership:
        """
        Grant another user access to a patient profile (e.g., both parents managing child).
        
        Args:
            db: Database session
            granter_user_id: ID of the user granting access
            grantee_user_id: ID of the user receiving access
            patient_profile_id: ID of the patient profile
            relationship_type: Type of relationship
            access_level: Access level to grant
            can_manage_family: Whether grantee can manage other family members
            
        Returns:
            Created FamilyMembership object
        """
        # Verify granter has permission to manage family
        granter_membership = db.query(FamilyMembership).filter(
            and_(
                FamilyMembership.user_id == granter_user_id,
                FamilyMembership.patient_profile_id == patient_profile_id,
                FamilyMembership.is_active == True,
                FamilyMembership.can_manage_family == True
            )
        ).first()
        
        if not granter_membership:
            raise ValueError("User does not have permission to manage this family")
        
        # Check if membership already exists
        existing = db.query(FamilyMembership).filter(
            and_(
                FamilyMembership.user_id == grantee_user_id,
                FamilyMembership.patient_profile_id == patient_profile_id,
                FamilyMembership.is_active == True
            )
        ).first()
        
        if existing:
            raise ValueError("User already has active access to this patient")
        
        # Create new membership
        membership = FamilyMembership(
            user_id=grantee_user_id,
            patient_profile_id=patient_profile_id,
            relationship_type=relationship_type,
            access_level=access_level,
            can_manage_family=can_manage_family,
            created_by=granter_user_id,
            is_active=True
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        
        return membership
    
    @staticmethod
    def revoke_access(
        db: Session,
        revoker_user_id: UUID,
        membership_id: UUID
    ) -> FamilyMembership:
        """
        Revoke a user's access to a patient profile (soft delete).
        
        Args:
            db: Database session
            revoker_user_id: ID of the user revoking access
            membership_id: ID of the membership to revoke
            
        Returns:
            Updated FamilyMembership object
        """
        membership = db.query(FamilyMembership).filter(
            FamilyMembership.id == membership_id
        ).first()
        
        if not membership:
            raise ValueError("Membership not found")
        
        # Verify revoker has permission
        revoker_membership = db.query(FamilyMembership).filter(
            and_(
                FamilyMembership.user_id == revoker_user_id,
                FamilyMembership.patient_profile_id == membership.patient_profile_id,
                FamilyMembership.is_active == True,
                FamilyMembership.can_manage_family == True
            )
        ).first()
        
        if not revoker_membership and membership.user_id != revoker_user_id:
            raise ValueError("User does not have permission to revoke this access")
        
        # Soft delete
        membership.is_active = False
        membership.revoked_at = datetime.utcnow()
        membership.revoked_by = revoker_user_id
        
        db.commit()
        db.refresh(membership)
        
        return membership
    
    @staticmethod
    def get_family_members(
        db: Session,
        patient_profile_id: UUID,
        include_inactive: bool = False
    ) -> List[FamilyMembership]:
        """
        Get all users who have access to a patient profile.
        
        Args:
            db: Database session
            patient_profile_id: ID of the patient profile
            include_inactive: Whether to include revoked memberships
            
        Returns:
            List of FamilyMembership objects
        """
        query = db.query(FamilyMembership).filter(
            FamilyMembership.patient_profile_id == patient_profile_id
        )
        
        if not include_inactive:
            query = query.filter(FamilyMembership.is_active == True)
        
        return query.all()
