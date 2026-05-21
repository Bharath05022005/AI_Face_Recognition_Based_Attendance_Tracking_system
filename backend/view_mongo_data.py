import pprint
from pymongo import MongoClient

import os
from dotenv import load_dotenv

load_dotenv()

def show_database():
    print("=== CADD Attendance Database (MongoDB) ===")
    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    db_name = os.getenv("MONGO_DB", "cadd_attendance")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    collections = db.list_collection_names()
    print(f"Found {len(collections)} collections: {collections}\n")
    
    for coll_name in collections:
        print(f"--- Collection: {coll_name} ---")
        docs = list(db[coll_name].find())
        print(f"Count: {len(docs)} documents")
        for doc in docs:
            # Shorten embedding for readability
            if "embedding" in doc:
                doc["embedding"] = "<Face Data Hidden>"
            pprint.pprint(doc)
            print()
            
if __name__ == "__main__":
    show_database()
