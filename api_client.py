import httpx
from typing import Any
from config import log_event


class MicroFnAPIClient:
    BASE_URL = "http://localhost:3000/api"
    RUN_BASE_URL = "http://localhost:3000"

    def __init__(self, token: str):
        if not token:
            log_event("MicroFnAPIClient initialized with no token.")
            raise ValueError("API token cannot be empty.")
        self.token = token
        log_event("MicroFnAPIClient initialized with token.")

    def _headers(self):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        log_event(f"Request headers: {headers}")
        return headers

    def create_workspace_with_code(self, name: str, code: str) -> dict:
        url = f"{self.BASE_URL}/workspaces"
        body = {"name": name, "initialCode": code}
        log_event(f"POST {url} with body: {body}")
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("workspace", {})

    def get_workspace_code(self, function_id: str) -> str:
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("code", "")

    def update_workspace_code(self, function_id: str, code: str) -> dict:
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        body = {"code": code}
        log_event(f"POST {url} with body: {body}")
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json()

    def get_latest_deployment(self, function_id: str) -> dict:
        url = f"{self.BASE_URL}/workspaces/{function_id}/deployments/latest"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("deployment", {})

    def get_workspaces(self):
        url = f"{self.BASE_URL}/workspaces"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("workspaces", [])

    def execute_function(self, workspace_id: str, input_data: Any):
        url = f"{self.RUN_BASE_URL}/run/{workspace_id}"
        log_event(f"POST {url} with JSON body: {input_data}")
        resp = httpx.post(url, headers=self._headers(), json=input_data, timeout=30)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception as e:
            log_event(f"Response is not JSON: {e}. Returning raw text.")
            return resp.text
