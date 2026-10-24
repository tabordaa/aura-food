import pytest
from fastapi import HTTPException

from app import models, oauth2


def test_require_roles_allows_listed_role(admin):
    checker = oauth2.require_roles(models.RoleEnum.admin)

    assert checker(current_user=admin) is admin


def test_require_roles_rejects_other_roles(customer):
    checker = oauth2.require_roles(models.RoleEnum.admin, models.RoleEnum.domiciliario)

    with pytest.raises(HTTPException) as error:
        checker(current_user=customer)

    assert error.value.status_code == 403


def test_token_signed_with_old_hardcoded_key_is_rejected(client, admin):
    import jwt

    forged = jwt.encode({"user_id": str(admin.id)}, "fallback_secret_key_if_env_fails_123", algorithm="HS256")

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})

    assert response.status_code == 401
