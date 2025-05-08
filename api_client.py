import httpx
from typing import Any


class MicroFnAPIClient:
    BASE_URL = "http://localhost:3000/api"
    RUN_BASE_URL = "http://localhost:3000"

    def __init__(self, token: str):
        if not token:
            raise ValueError("API token cannot be empty.")
        self.token = token

    def _headers(self):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        return headers

    def create_workspace_with_code(self, name: str, code: str) -> dict:
        url = f"{self.BASE_URL}/workspaces"
        body = {"name": name, "initialCode": code}
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        resp.raise_for_status()
        return resp.json().get("workspace", {})

    def get_workspace_code(self, function_id: str) -> str:
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json().get("code", "")

    def update_workspace_code(self, function_id: str, code: str) -> dict:
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        body = {"code": code}
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        resp.raise_for_status()
        return resp.json()

    def get_latest_deployment(self, function_id: str) -> dict:
        url = f"{self.BASE_URL}/workspaces/{function_id}/deployments/latest"
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json().get("deployment", {})

    def get_workspaces(self):
        url = f"{self.BASE_URL}/workspaces"
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json().get("workspaces", [])

    def execute_function(self, workspace_id: str, input_data: Any):
        url = f"{self.RUN_BASE_URL}/run/{workspace_id}"
        resp = httpx.post(url, headers=self._headers(), json=input_data, timeout=30)
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception as e:
            return resp.text

    # --- Secret Management Methods ---

    def get_secrets(self, workspace_id: str) -> list:
        """
        Get all secrets for a workspace.

        Args:
            workspace_id (str): The workspace ID.

        Returns:
            list: List of secret objects.
        """
        url = f"{self.BASE_URL}/workspaces/{workspace_id}/secrets"
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json().get("secrets", [])

    def create_secret(self, workspace_id: str, key: str, value: str) -> list:
        """
        Create a new secret for a workspace.

        Args:
            workspace_id (str): The workspace ID.
            key (str): The secret key.
            value (str): The secret value.

        Returns:
            list: List of secret objects after creation.
        """
        url = f"{self.BASE_URL}/workspaces/{workspace_id}/secrets"
        body = {"key": key, "value": value}
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=10)
        resp.raise_for_status()
        return resp.json().get("secrets", [])

    def delete_secret(self, workspace_id: str, secret_id: str) -> dict:
        """
        Delete a secret from a workspace.

        Args:
            workspace_id (str): The workspace ID.
            secret_id (str): The secret ID.

        Returns:
            dict: Empty dict on success.
        """
        url = f"{self.BASE_URL}/workspaces/{workspace_id}/secrets/{secret_id}"
        resp = httpx.delete(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json() if resp.text else {}

    def update_workspace_name(self, workspace_id: str, new_name: str) -> dict:
        """
        Update the name of a workspace (function).

        Args:
            workspace_id (str): The workspace ID.
            new_name (str): The new name for the workspace.

        Returns:
            dict: The updated workspace object.
        """
        url = f"{self.BASE_URL}/workspaces/{workspace_id}"
        body = {"name": new_name}
        resp = httpx.patch(url, headers=self._headers(), json=body, timeout=10)
        resp.raise_for_status()
        return resp.json().get("workspace", {})
