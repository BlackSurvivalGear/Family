import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_multi_tree_tests(page):
    # Set up console log listeners and dialog handlers
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))
    page.on("dialog", lambda dialog: (print(f"[Browser Alert] {dialog.message}"), dialog.accept()))

    dynamic_email = f"multi.tree.test.{int(time.time())}@lawal.org"

    print("Registering a new user...")
    page.goto("http://localhost:8000/register.html")
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
        localStorage.setItem("cloudinary_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(1000)
    page.fill("#firstName", "MultiTreeAdmin")
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
    page.wait_for_timeout(1500)

    print("Logging in the user...")
    page.goto("http://localhost:8000/signin.html")
    page.wait_for_timeout(1000)
    page.fill("#email", dynamic_email)
    page.fill("#password", "password123")
    page.click("button[type='submit']")
    page.wait_for_timeout(1500)

    proceed_btn = page.locator("#proceed-unverified-btn")
    if proceed_btn.is_visible():
        proceed_btn.click()
        page.wait_for_timeout(2000)

    # Elevate role to SUPER_ADMIN so we can check everything including statistics, selectors, and permissions
    print("Elevating role to SUPER_ADMIN...")
    page.goto("http://localhost:8000/trees.html")
    page.wait_for_timeout(1000)
    page.evaluate("""() => {
        const cached = localStorage.getItem('lawal_current_user');
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.role = 'SUPER_ADMIN';
            localStorage.setItem('lawal_current_user', JSON.stringify(parsed));
        }
    }""")
    page.reload()
    page.wait_for_timeout(1500)

    # 1. TEST STATISTICS DISPLAY: Check if statistics exist on trees.html
    print("Testing statistics on Family Trees dashboard page...")
    # Verify the four trees are displayed
    trees_grid = page.locator("#trees-grid")
    assert trees_grid.is_visible(), "Trees grid must be visible"

    # We should have 4 tree panels
    cards_count = page.locator("#trees-grid > div").count()
    print(f"Found {cards_count} family tree cards.")
    assert cards_count >= 4, "Should display at least the 4 seeded default trees."

    # Validate statistics: check that we can find members and generations stats
    first_tree_text = page.locator("#trees-grid > div").first.inner_text()
    print(f"DEBUG first_tree_text:\n{first_tree_text}")
    assert "Members" in first_tree_text or "MEMBERS" in first_tree_text.upper(), "Statistics must display total Members."
    assert "Generations" in first_tree_text or "GENERATIONS" in first_tree_text.upper(), "Statistics must display Generations."
    print("Tree statistics display verified successfully!")

    # 2. TEST TREE SELECTION & THEMING: Select Grimster tree and verify customization
    print("Testing tree selection and dynamic visual customizations...")
    # Find Open Tree button for Grimster
    grimster_card = page.locator("#trees-grid > div:has-text('Grimster')")
    grimster_card.locator("a:has-text('Open Tree')").click()
    page.wait_for_timeout(2000)

    # We should be on tree.html with treeId query param
    current_url = page.url
    print(f"Current URL: {current_url}")
    assert "treeId=grimster" in current_url, "Navigating to Grimster tree should include treeId=grimster in query."

    # Check banner header elements
    banner_title = page.locator("#tree-banner-title").inner_text()
    assert "Grimster" in banner_title, "Banner title should dynamically display 'Grimster'."
    print("Dynamic banner title verified successfully!")

    # 3. TEST SHARED MEMBERS: Verifying Mary Grimster is rendered in Grimster tree
    print("Testing Shared Members: check Mary Grimster rendering on Grimster canvas...")
    mary_card = page.locator("#tree-cards-layer > div:has-text('Mary Grimster')")
    assert mary_card.is_visible(), "Mary Grimster should be rendered on Grimster canvas."
    print("Shared member Mary Grimster verified successfully!")

    # 4. TEST CROSS-TREE RELATIONSHIPS: View spouse connections across trees
    print("Testing cross-tree relationships in Quick view drawer...")
    # Click Mary's quick view button
    mary_card.locator(".quick-info-btn").click()
    page.wait_for_timeout(1500)

    # Quick drawer should show tree memberships
    drawer = page.locator("#quick-view-drawer")
    assert drawer.is_visible(), "Quick Profile drawer should open."
    drawer_text = drawer.inner_text()
    assert "Mary Grimster" in drawer_text, "Quick profile should display correct member name."
    assert "Grimster, Oluwanje, Ogunronbi" in drawer_text, "Quick profile must list memberships in Grimster, Oluwanje, Ogunronbi."
    print("Tree memberships listed in Quick drawer verified successfully!")

    # Close Quick drawer
    page.locator("#close-drawer-btn").click()
    page.wait_for_timeout(500)

    # 5. TEST SEARCH SCOPE AND AUTO-SWITCHING: Searching "All Trees" for a non-Grimster member
    print("Testing scope-based search and cross-tree auto-switching...")
    # Set search scope to "All Trees"
    page.locator("#tree-search-scope").select_option("all")
    page.wait_for_timeout(500)

    # Search for "Kolawole" (Who is in House of Lawal, NOT Grimster)
    page.locator("#tree-search-input").fill("Kolawole")
    page.wait_for_timeout(1500)

    # Autocomplete popup should show Kolawole Lawal with "House of Lawal" membership
    autocomplete = page.locator("#tree-search-autocomplete")
    assert autocomplete.is_visible(), "Autocomplete should open"
    autocomplete_text = autocomplete.inner_text()
    assert "Kolawole" in autocomplete_text, "Should find Kolawole in results"

    # Click Kolawole Lawal and verify redirect/switch tree
    autocomplete.locator("button:has-text('Kolawole')").click()
    page.wait_for_timeout(2500)

    # We should have switched to house-of-lawal tree
    print(f"URL after search click: {page.url}")
    assert "treeId=house-of-lawal" in page.url or "treeId=" not in page.url, "Should auto-switch to House of Lawal tree."
    print("Cross-tree search and automatic switching verified successfully!")

    # 6. TEST PERMISSIONS: Demote role to GUEST and verify edit options are hidden/denied
    print("Testing permissions on trees and relationships editing...")
    page.goto("http://localhost:8000/trees.html")
    page.wait_for_timeout(1000)
    page.evaluate("""() => {
        const cached = localStorage.getItem('lawal_current_user');
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.role = 'GUEST';
            localStorage.setItem('lawal_current_user', JSON.stringify(parsed));
        }
    }""")
    page.reload()
    page.wait_for_timeout(1500)

    # "Create New Tree" button should be hidden for GUEST
    create_btn = page.locator("#create-tree-trigger-btn")
    assert not create_btn.is_visible(), "Create Tree button must be hidden for GUEST accounts."
    print("Permissions check for GUEST verified successfully!")

    page.screenshot(path="verification/screenshots/multi_tree_verification.png")
    print("Took multi-tree verification test results screenshot.")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    print("Starting Playwright for Multi-Tree Genealogy System Verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            run_multi_tree_tests(page)
            print("Multi-Tree Genealogy System Tests PASSED with absolute success!")
            sys.exit(0)
        except Exception as e:
            print(f"Multi-Tree Genealogy System Tests FAILED: {e}")
            page.screenshot(path="verification/screenshots/multi_tree_error.png")
            sys.exit(1)
        finally:
            context.close()
            browser.close()
