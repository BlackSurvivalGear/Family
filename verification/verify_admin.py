import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_admin_e2e(page):
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

    print("\n--- STEP 1: Logging in as Super Admin ---")
    page.goto("http://localhost:8000/signin.html")
    # Force simulation mode
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(1000)

    # Log in as admin@lawal.org
    page.fill("#email", "admin@lawal.org")
    page.fill("#password", "admin123")
    page.click("button[type='submit']")
    page.wait_for_timeout(2500)

    print(f"Current URL after login: {page.url}")
    if "dashboard.html" not in page.url:
        print("Error: Super Admin login did not redirect to dashboard!")
        sys.exit(1)

    print("\n--- STEP 2: Verifying Administration menu option visibility ---")
    admin_menu_item = page.locator("a[href='admin.html']")
    if admin_menu_item.is_visible():
        print("Success: Administration menu item is visible for Super Admin.")
    else:
        print("Error: Administration menu item is missing from sidebar!")
        sys.exit(1)

    # Navigate to Administration page
    print("Navigating to admin.html via menu item click...")
    admin_menu_item.click()
    page.wait_for_timeout(2000)

    print(f"Current URL: {page.url}")
    if "admin.html" not in page.url:
        print("Error: Clicking Admin menu item did not load admin.html!")
        sys.exit(1)

    # Take screenshot of the Admin Dashboard
    os.makedirs("/app/verification/screenshots", exist_ok=True)
    page.screenshot(path="/app/verification/screenshots/admin_dashboard.png")
    print("Screenshot taken of Admin Dashboard.")

    print("\n--- STEP 3: Verifying User Directory and Role Dropdowns ---")
    # Verify Tunde, Femi, Kunle, Chioma, Sola exist in the table
    users_body = page.locator("#users-table-body")
    tbody_text = users_body.inner_text()
    expected_users = ["Tunde", "Femi", "Kunle", "Chioma", "Sola"]
    for eu in expected_users:
        if eu in tbody_text:
            print(f"✓ Registered user '{eu}' found in User Directory.")
        else:
            print(f"Error: Registered user '{eu}' is missing from directory!")
            sys.exit(1)

    print("\n--- STEP 4: Testing Role Assignment and Confirmation ---")
    # Target 'Kunle Lawal' dropdown to change from CONTRIBUTOR to EDITOR
    kunle_select = page.locator("select[data-uid='mock-contrib']")
    if not kunle_select.is_visible():
        print("Error: Dropdown for Kunle Lawal not found!")
        sys.exit(1)

    print("Selecting new role (EDITOR) for Kunle...")
    kunle_select.select_option("EDITOR")
    page.wait_for_timeout(1000)

    # Verify confirmation dialog is visible
    confirm_modal = page.locator("#confirm-modal")
    if confirm_modal.is_visible():
        print("✓ Custom confirmation modal displayed successfully for role change!")
    else:
        print("Error: Confirmation modal did not display on role change!")
        sys.exit(1)

    # Take screenshot of confirmation modal
    page.screenshot(path="/app/verification/screenshots/admin_confirm_modal.png")

    # Confirm the assignment
    print("Clicking Confirm in the modal...")
    page.click("#confirm-ok-btn")
    page.wait_for_timeout(1500)

    # Verify success alert
    alert_box = page.locator("#admin-alert-box")
    if alert_box.is_visible() and "updated successfully" in alert_box.inner_text():
        print("✓ Success alert displayed correctly:", alert_box.inner_text())
    else:
        print("Error: Success alert box not shown or incorrect text!")

    print("\n--- STEP 5: Verifying Audit Log creation for Role Assignment ---")
    # Verify audit log entry is added
    audit_body = page.locator("#audit-table-body")
    audit_text = audit_body.inner_text()
    if "ROLE CHANGE" in audit_text and "Kunle" in audit_text:
        print("✓ Audit log successfully created and listed for the Role Assignment!")
    else:
        print("Error: No audit log entry found for the Role Assignment!")
        sys.exit(1)

    print("\n--- STEP 6: Testing Account Enable/Disable ---")
    # Sola Lawal is currently disabled. Let's find Sola's toggle button and enable it.
    sola_toggle_btn = page.locator("button.status-toggle-btn[data-uid='mock-member']")
    if not sola_toggle_btn.is_visible():
        print("Error: Enable/Disable button for Sola Lawal not found!")
        sys.exit(1)

    print("Clicking Sola Lawal's Enable button...")
    sola_toggle_btn.click()
    page.wait_for_timeout(1000)

    # Confirm deactivation toggle
    print("Confirming status change in modal...")
    page.click("#confirm-ok-btn")
    page.wait_for_timeout(1500)

    # Re-fetch Sola's status toggle button from the fresh DOM
    fresh_sola_btn = page.locator("button.status-toggle-btn[data-uid='mock-member']")
    new_sola_btn_text = fresh_sola_btn.inner_text()
    if "disable" in new_sola_btn_text.lower():
        print("✓ Sola Lawal's account status updated to Active successfully!")
    else:
        print(f"Error: Sola's status button text is '{new_sola_btn_text}', expected 'Disable'!")
        sys.exit(1)

    # Verify status change logged in audit logs
    audit_text = page.locator("#audit-table-body").inner_text()
    print("DEBUG: audit_text =\n", audit_text)
    if "ACCOUNT STATUS CHANGE" in audit_text and "Sola" in audit_text:
        print("✓ Audit log successfully created and listed for the Account Status Change!")
    else:
        print("Error: No audit log entry found for the Account Status Change!")
        sys.exit(1)

    # Take screenshot of updated state and audit logs
    page.screenshot(path="/app/verification/screenshots/admin_updated_audit_logs.png")

    print("\n--- STEP 7: Testing Access Restrictions for Non-Admins ---")
    # Log out
    print("Logging out Super Admin secure session...")
    page.click("#logout-btn")
    page.wait_for_timeout(1500)

    # Register/log in as a Viewer (e.g. chioma.viewer@lawal.org)
    print("Logging in as a read-only VIEWER (chioma.viewer@lawal.org)...")
    page.goto("http://localhost:8000/signin.html")
    # Ensure simulation mode for viewer as well
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(1000)

    page.fill("#email", "chioma.viewer@lawal.org")
    page.fill("#password", "secret123")
    page.click("button[type='submit']")
    page.wait_for_timeout(2500)

    print(f"Current URL after viewer login: {page.url}")

    # Verify Administration option is NOT visible
    viewer_admin_menu = page.locator("a[href='admin.html']")
    if not viewer_admin_menu.is_visible():
        print("✓ Success: Administration option is NOT visible in the sidebar for Viewers.")
    else:
        print("Error: Administration option is visible to Viewer!")
        sys.exit(1)

    # Attempt direct navigation to admin.html
    print("Attempting direct URL navigation to admin.html...")
    page.goto("http://localhost:8000/admin.html")
    page.wait_for_timeout(2000)

    # Verify redirected back to dashboard or signin
    print(f"Redirected URL: {page.url}")
    if "admin.html" not in page.url:
        print("✓ Success: Viewer was blocked and redirected away from admin.html.")
    else:
        print("Error: Viewer successfully accessed admin.html directly! Access restriction failed.")
        sys.exit(1)

    print("\n--- E2E Administration Verification PASSED! ---")

if __name__ == "__main__":
    os.makedirs("/app/verification/videos", exist_ok=True)
    os.makedirs("/app/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/app/verification/videos"
        )
        page = context.new_page()
        try:
            run_admin_e2e(page)
        except Exception as e:
            print(f"Exception during verification: {e}")
            page.screenshot(path="/app/verification/screenshots/admin_error.png")
            sys.exit(1)
        finally:
            context.close()
            browser.close()
            print("Finished.")
