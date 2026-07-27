import json
import os
from typing import List, Dict, Any, Optional

from app.core.config import settings

class CatalogService:
    _instance = None
    _data = None
    _clinical_orders_data = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CatalogService, cls).__new__(cls)
            cls._instance._load_data()
            cls._instance._load_clinical_orders()
        return cls._instance

    def _load_data(self):
        # Assuming catalog_es.json is in app/data/catalog_es.json
        # Adjust path as necessary based on project structure
        file_path = os.path.join(settings.BASE_DIR, "app/data/catalog_es.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        except FileNotFoundError:
            print(f"Catalog file not found at {file_path}")
            self._data = {"terminology": {"allergies": [], "conditions": []}, "ui_options": {}}

    def _load_clinical_orders(self):
        file_path = os.path.join(settings.BASE_DIR, "app/data/clinical_orders_es.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                self._clinical_orders_data = json.load(f)
        except FileNotFoundError:
            print(f"Clinical orders catalog not found at {file_path}")
            self._clinical_orders_data = {"order_options": {}}

    def search_allergies(self, query: str) -> List[Dict[str, Any]]:
        if not self._data:
            return []
        
        query = query.lower().strip()
        allergies = self._data.get("terminology", {}).get("allergies", [])
        
        results = []
        for item in allergies:
            # Check display name
            if query in item["display"].lower():
                results.append(item)
                continue
            
            # Check synonyms
            for synonym in item.get("synonyms", []):
                if query in synonym.lower():
                    results.append(item)
                    break 
        
        # Simple relevance sorting could be added here
        return results[:50] # Limit results

    def search_conditions(self, query: str) -> List[Dict[str, Any]]:
        if not self._data:
            return []
            
        query = query.lower().strip()
        conditions = self._data.get("terminology", {}).get("conditions", [])
        
        results = []
        for item in conditions:
             # Check display name
            if query in item["display"].lower():
                results.append(item)
                continue
            
            # Check synonyms
            for synonym in item.get("synonyms", []):
                if query in synonym.lower():
                    results.append(item)
                    break
                    
        return results[:50]

    def search_vaccines(self, query: str) -> List[Dict[str, Any]]:
        if not self._data:
            return []

        query = query.lower().strip()
        vaccines = self._data.get("terminology", {}).get("vaccines", [])

        results = []
        for item in vaccines:
            # Check display name
            if query in item["display"].lower():
                results.append(item)
                continue

            # Check synonyms
            for synonym in item.get("synonyms", []):
                if query in synonym.lower():
                    results.append(item)
                    break

        return results[:50]

    def get_ui_options(self) -> Dict[str, Any]:
        if not self._data:
            return {}
        return self._data.get("ui_options", {})

    def get_clinical_order_options(self, order_type: Optional[str] = None) -> Dict[str, Any]:
        """Get predefined clinical order options, optionally filtered by type."""
        if not self._clinical_orders_data:
            return {}

        all_options = self._clinical_orders_data.get("order_options", {})

        if order_type:
            upper_type = order_type.upper()
            if upper_type in all_options:
                return {upper_type: all_options[upper_type]}
            return {}

        return all_options

catalog_service = CatalogService()

