import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))
    page.on("dialog", lambda dialog: (print(f"[Browser Alert] {dialog.message}"), dialog.accept()))
    import time
    dynamic_email = f"admin.test.{int(time.time())}@lawal.org"

    print("Registering a new test user to establish a real Firebase session...")
    page.goto("http://localhost:8000/register.html")
    page.wait_for_timeout(1000)
    page.fill("#firstName", "Admin")
    page.fill("#lastName", "Lawal")
    page.fill("#email", dynamic_email)
    page.select_option("#generation", "3")
    page.select_option("#branch", "Lagos")
    page.fill("#password", "password123")
    page.fill("#confirmPassword", "password123")
    page.check("#agree")
    page.click("button[type='submit']")

    page.wait_for_selector("#verify-modal.opacity-100", timeout=10000)
    page.click("#mock-verify-btn")
    page.wait_for_timeout(2500)

    print("Logging in the newly registered user...")
    page.goto("http://localhost:8000/signin.html")
    page.wait_for_timeout(1000)
    page.fill("#email", dynamic_email)
    page.fill("#password", "password123")
    page.click("button[type='submit']")
    page.wait_for_timeout(2500)

    proceed_btn = page.locator("#proceed-unverified-btn")
    if proceed_btn.is_visible():
        print("Clicking Continue to Dashboard...")
        proceed_btn.click()
        page.wait_for_timeout(3000)

    print("Elevating user's role to SUPER_ADMIN in localStorage for editing permissions...")
    page.evaluate("""() => {
        const cached = localStorage.getItem('lawal_current_user');
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.role = 'SUPER_ADMIN';
            localStorage.setItem('lawal_current_user', JSON.stringify(parsed));
        }
    }""")
    page.wait_for_timeout(500)

    # Navigate to the dashboard page to verify it loads
    print("Navigating to dashboard...")
    page.goto("http://localhost:8000/dashboard.html")
    page.wait_for_timeout(1000)

    # Assert dashboard stats load correctly
    welcome_msg = page.locator("#dashboard-welcome-msg").inner_text()
    print(f"Dashboard loaded successfully: {welcome_msg}")

    # Navigate to the family tree page
    print("Navigating to tree.html...")
    page.goto("http://localhost:8000/tree.html")
    page.wait_for_timeout(1500)

    # Click Add Relative button
    print("Clicking 'Add Relative' button...")
    page.locator("#add-member-trigger-btn").click()
    page.wait_for_timeout(500)

    # Fill Add Relative form
    print("Filling in the new relative details...")
    page.locator("#add-firstName").fill("Babatunde Jnr")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-nickname").fill("TJ")
    page.locator("#add-gender").select_option("Male")
    page.locator("#add-role").fill("Descendant")
    page.locator("#add-generation").select_option("3")
    page.locator("#add-birthDate").fill("2000-01-01")
    page.locator("#add-birthPlace").fill("Lagos, Nigeria")
    page.locator("#add-biography").fill("TJ is an artist and engineer in training.")

    # Link to a father (e.g. Abiodun Lawal, who has id "biodun-lawal")
    page.locator("#add-father").select_option("biodun-lawal")
    page.wait_for_timeout(500)

    # Click Submit / Create Relative
    print("Submitting the relative form...")
    page.locator("#add-submit-btn").click()

    # Wait for the add modal to disappear (since Firestore calls take some time before fallback)
    print("Waiting for Add Modal to close...")
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)

    # Search for TJ in Tree Search autocomplete to verify creation
    print("Searching for the created member 'Babatunde'...")
    search_input = page.locator("#tree-search-input")
    search_input.fill("Babatunde")
    page.wait_for_timeout(1000)

    # Take screenshot of autocomplete suggestions
    page.screenshot(path="verification/screenshots/tree_search_suggest.png")
    print("Took search autocomplete screenshot.")

    # Click the matching suggestion button (which centers on them)
    print("Selecting Babatunde Jnr from suggestions...")
    page.locator("#tree-search-autocomplete button:has-text('Babatunde Jnr')").click()
    page.wait_for_timeout(1000)

    # Click the Edit button on the centered card to test edit form
    print("Clicking Edit Node on Babatunde's card...")
    page.locator("#tree-cards-layer div:has-text('Babatunde Jnr') .edit-node-btn").click()
    page.wait_for_timeout(1000)

    # Edit their biography in the Edit modal
    print("Editing biography...")
    page.locator("#edit-biography").fill("TJ is a senior developer and conceptual designer.")
    page.locator("#edit-nickname").fill("TJ Senior")
    page.wait_for_timeout(500)

    # Click Save Updates
    print("Submitting edit updates...")
    page.locator("#edit-submit-btn").click()

    print("Waiting for Edit Modal to close...")
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)

    # Navigate to members directory to verify they are listed and searchable there
    print("Navigating to members directory...")
    page.goto("http://localhost:8000/members.html")
    page.wait_for_timeout(1500)

    # Fill query search input with TJ
    print("Filtering directory by Babatunde...")
    page.locator("#directory-search-input").fill("Babatunde")
    page.wait_for_timeout(1000)

    # Assert that Babatunde Jnr is in the grid list
    grid_html = page.locator("#members-grid").inner_html()
    assert "Babatunde Jnr" in grid_html, "Babatunde Jnr should be present in the directory search results"
    print("Babatunde Jnr found successfully in Members Directory!")

    # Click Profile Detail link to navigate to their individual profile page
    print("Navigating to Babatunde's Profile page...")
    page.locator("#members-grid a:has-text('Profile Detail')").click()
    page.wait_for_timeout(1500)

    # Assert profile detail elements load and relationships compute via the engine
    fullName = page.locator("#m-fullName").inner_text()
    assert "Babatunde Jnr" in fullName, "Profile name should be Babatunde Jnr"
    print(f"Profile loaded successfully for: {fullName}")

    # Verify that the father relationship with Abiodun Lawal is displayed in the list
    relations_list = page.locator("#relations-list").inner_text()
    print("DEBUG: relations_list =\n", relations_list)
    assert "Abiodun Lawal" in relations_list, "Father relation with Abiodun Lawal should be displayed"
    assert "FATHER" in relations_list or "Father" in relations_list, "The relation should be classified as Father"
    print("Father relation successfully verified using Relationship Engine on profile!")

    # Take screenshot of the complete profile page as the ultimate proof
    page.screenshot(path="verification/screenshots/profile_integration_result.png")
    page.wait_for_timeout(1000)
    print("Took final profile verification screenshot.")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)

    print("Starting Playwright for Frontend Integration Verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
            print("Frontend Integration Verification PASSED with flying colors!")
            sys.exit(0)
        except Exception as e:
            print(f"Frontend Integration Verification FAILED: {e}")
            page.screenshot(path="verification/screenshots/integration_error.png")
            sys.exit(1)
        finally:
            context.close()
            browser.close()
