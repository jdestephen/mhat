import json
import os
from typing import List, Dict, Any, Optional

from app.core.config import settings

class CatalogService:
    _instance = None
    _data = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CatalogService, cls).__new__(cls)
            cls._instance._load_data()
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

    def get_ui_options(self) -> Dict[str, Any]:
        if not self._data:
            return {}
        return self._data.get("ui_options", {})

catalog_service = CatalogService()
