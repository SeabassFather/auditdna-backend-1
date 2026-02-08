class Grower(BaseModel):
    name: str
    country: str
    region: str
    latitude: float
    longitude: float
    crops: List[str]
    certifications: List[str]
    contact: Dict[str, str]