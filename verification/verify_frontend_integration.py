import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    print("Navigating to signin.html to initialize local session...")
    page.goto("http://localhost:8000/signin.html")
    page.wait_for_timeout(1000)

    # Set the admin logged-in session in localStorage
    print("Setting admin session in localStorage...")
    page.evaluate("""() => {
        localStorage.clear();
        localStorage.setItem('lawal_current_user', JSON.stringify({
            uid: 'admin-uid',
            firstName: 'Admin',
            lastName: 'Lawal',
            displayName: 'Admin Lawal',
            email: 'admin@lawal.org',
            photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
            role: 'SUPER_ADMIN',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            active: true
        }));
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
    page.wait_for_timeout(1500)

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
    page.wait_for_timeout(1500)

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
