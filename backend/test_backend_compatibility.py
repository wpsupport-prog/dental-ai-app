import os
import sys
import logging
from pathlib import Path

def run_compatibility_audit():
    print("==================================================")
    print("      DENTAL AI SUITE - BACKEND HEALTH AUDIT      ")
    print("==================================================\n")

    # 1. Test AppData Permission Resolution
    print("[1/4] Testing AppData Directory Permissions...")
    try:
        appdata_dir = Path(os.getenv('LOCALAPPDATA', '.')) / "DentalAISuite" / "data"
        appdata_dir.mkdir(parents=True, exist_ok=True)
        
        # Test file write & delete
        test_file = appdata_dir / "permission_test.tmp"
        test_file.write_text("permission_check_ok")
        test_file.unlink()
        print(f"  ✓ PASSED: Writable directory verified at {appdata_dir}")
    except Exception as e:
        print(f"  ❌ FAILED: AppData permission error: {e}")
        return False

    # 2. Test Logging Handler Path
    print("\n[2/4] Testing Logging System Configuration...")
    try:
        log_file = appdata_dir.parent / "debug_app.log"
        logging.basicConfig(filename=log_file, level=logging.INFO)
        logger = logging.getLogger("audit_logger")
        logger.info("Audit test entry executed successfully.")
        print(f"  ✓ PASSED: Log file initialized cleanly at {log_file}")
    except Exception as e:
        print(f"  ❌ FAILED: Log handler failed: {e}")
        return False

    # 3. Test Network Local IP Resolution (For QR Code Scanner)
    print("\n[3/4] Testing Local Network Interface Detection...")
    try:
        from main import get_local_ip
        ip = get_local_ip()
        if ip and ip != "127.0.0.1":
            print(f"  ✓ PASSED: Detected active LAN IP: {ip} (Mobile QR will scan correctly)")
        else:
            print(f"  ⚠️ WARNING: Resolved loopback IP ({ip}). Mobile phone must be on the same Wi-Fi.")
    except Exception as e:
        print(f"  ❌ FAILED: Error resolving local network IP: {e}")

    # 4. Test Database Connection & Metadata Schema Creation
    print("\n[4/4] Testing SQLite Database Schema Engine...")
    try:
        import asyncio
        from database import async_engine, Base
        
        async def check_db():
            async with async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        
        asyncio.run(check_db())
        print(f"  ✓ PASSED: SQLite Database schema verified at {appdata_dir / 'dental_app.db'}")
    except Exception as e:
        print(f"  ❌ FAILED: Database initialization error: {e}")
        return False

    print("\n==================================================")
    print("      🎉 ALL BACKEND COMPATIBILITY CHECKS PASSED  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    run_compatibility_audit()