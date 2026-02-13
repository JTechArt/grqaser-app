#!/usr/bin/env python3
"""
Test script for the GRQASER Database Viewer API
"""

import requests
import json
import time

def test_api_endpoints():
    """Test all API endpoints"""
    base_url = "http://localhost:5001"
    
    print("🧪 Testing GRQASER Database Viewer API")
    print("=" * 50)
    
    # Test overview endpoint
    print("📊 Testing /api/overview...")
    try:
        response = requests.get(f"{base_url}/api/overview")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Overview: {data['totalBooks']} books, {data['totalAuthors']} authors")
        else:
            print(f"❌ Overview failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Overview error: {e}")
    
    # Test books endpoint
    print("📚 Testing /api/books...")
    try:
        response = requests.get(f"{base_url}/api/books")
        if response.status_code == 200:
            books = response.json()
            print(f"✅ Books: {len(books)} books loaded")
            if books:
                print(f"   Sample: {books[0]['title']} by {books[0]['author']}")
        else:
            print(f"❌ Books failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Books error: {e}")
    
    # Test authors endpoint
    print("👤 Testing /api/authors...")
    try:
        response = requests.get(f"{base_url}/api/authors")
        if response.status_code == 200:
            authors = response.json()
            print(f"✅ Authors: {len(authors)} authors loaded")
        else:
            print(f"❌ Authors failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Authors error: {e}")
    
    # Test queue endpoint
    print("🔗 Testing /api/queue...")
    try:
        response = requests.get(f"{base_url}/api/queue")
        if response.status_code == 200:
            queue = response.json()
            print(f"✅ Queue: {len(queue)} items loaded")
            if queue:
                pending = len([item for item in queue if item['status'] == 'pending'])
                completed = len([item for item in queue if item['status'] == 'completed'])
                failed = len([item for item in queue if item['status'] == 'failed'])
                print(f"   Pending: {pending}, Completed: {completed}, Failed: {failed}")
        else:
            print(f"❌ Queue failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Queue error: {e}")
    
    # Test search endpoint
    print("🔍 Testing /api/search...")
    try:
        response = requests.get(f"{base_url}/api/search?q=test")
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Search: {len(results)} results for 'test'")
        else:
            print(f"❌ Search failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Search error: {e}")
    
    # Test stats endpoint
    print("📈 Testing /api/stats...")
    try:
        response = requests.get(f"{base_url}/api/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Stats: Status stats available")
            if stats.get('statusStats'):
                for status, count in stats['statusStats'].items():
                    print(f"   {status}: {count}")
        else:
            print(f"❌ Stats failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Stats error: {e}")
    
    print("\n🎉 API testing completed!")
    print("🌐 Open http://localhost:5001 in your browser to view the web interface")

if __name__ == "__main__":
    # Wait a moment for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(2)
    test_api_endpoints()
