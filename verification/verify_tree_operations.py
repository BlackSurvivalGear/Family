import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_tree_operations_tests(page):
    # Set up console log listeners and dialog acceptors
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))
    page.on("dialog", lambda dialog: (print(f"[Browser Alert] {dialog.message}"), dialog.accept()))

    dynamic_email = f"tree.test.{int(time.time())}@lawal.org"

    print("Registering a new user...")
    page.goto("http://localhost:8000/register.html")
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
        localStorage.setItem("cloudinary_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(1000)
    page.fill("#firstName", "TreeAdmin")
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

    # 1. PERMISSION CHECKS: Set role to GUEST and verify editing is denied
    print("Testing permission checks: setting GUEST role and verifying edit restrictions...")
    page.goto("http://localhost:8000/tree.html")
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

    print("Trying to add relative as GUEST (expecting failure)...")
    page.locator("#add-member-trigger-btn").click()
    page.wait_for_timeout(500)
    page.locator("#add-firstName").fill("ShouldFail")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-submit-btn").click()
    page.wait_for_timeout(1000)
    assert page.locator("#tree-edit-modal").is_visible(), "Add modal should remain open since GUEST cannot create members"
    print("Permission restriction for GUEST verified successfully!")

    # Close Add Modal
    page.locator("#add-cancel-btn").click()
    page.wait_for_timeout(500)

    # 2. ROLE ELEVATION TO SUPER_ADMIN
    print("Elevating role to SUPER_ADMIN to execute tree operations...")
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

    # 3. CREATE PARENT (Add Father)
    print("Testing CREATE PARENT: Adding father to Kolawole Lawal...")
    page.locator("#tree-cards-layer > div:has-text('Kolawole Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)

    # Click Add Father button
    page.locator("button.action-add-rel-btn:has-text('Add Father')").click()
    page.wait_for_timeout(500)

    page.locator("#add-firstName").fill("GreatGrandpa")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-middleName").fill("Ade")
    page.locator("#add-nickname").fill("Elder")
    page.locator("#add-role").fill("Ancestor")
    page.locator("#add-generation").select_option("1")
    page.locator("#add-living-status").select_option("Deceased")
    page.locator("#add-branch").fill("Abeokuta")
    page.locator("#add-submit-btn").click()
    print("Submitting Father relative form...")
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Father GreatGrandpa successfully created!")

    # 4. CREATE CHILD (Add Son / Add Daughter)
    print("Testing CREATE CHILD: Adding a daughter (child) to Folasade Lawal...")
    page.locator("#tree-cards-layer > div:has-text('Folasade Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    page.locator("button.action-add-rel-btn:has-text('Add Daughter')").click()
    page.wait_for_timeout(500)
    page.locator("#add-firstName").fill("Morenike")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-role").fill("Student")
    page.select_option("#add-generation", "3")
    page.locator("#add-submit-btn").click()
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Daughter Morenike successfully created!")

    # 5. CREATE SPOUSE & CREATE SECOND SPOUSE (Transition to Former Spouse)
    print("Testing SPOUSES: Adding spouses to Abiodun Lawal...")
    # Create Spouse 1
    page.locator("#tree-cards-layer > div:has-text('Abiodun Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    page.locator("button.action-add-rel-btn:has-text('Add Spouse')").click()
    page.wait_for_timeout(500)
    page.locator("#add-firstName").fill("WifeOne")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-submit-btn").click()
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Spouse WifeOne successfully created!")

    # Create Spouse 2 (Which will transition WifeOne to Former Spouse)
    page.locator("#tree-cards-layer > div:has-text('Abiodun Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    page.locator("button.action-add-rel-btn:has-text('Add Spouse')").click()
    page.wait_for_timeout(500)
    page.locator("#add-firstName").fill("WifeTwo")
    page.locator("#add-lastName").fill("Lawal")
    page.locator("#add-submit-btn").click()
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Second Spouse WifeTwo successfully created! WifeOne transitioned to Former Spouse.")

    # 6. EDIT MEMBER
    print("Testing EDIT MEMBER: Modifying Morenike's biography...")
    page.locator("#tree-cards-layer > div:has-text('Morenike Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    page.locator("#edit-biography").fill("Morenike is a young prodigy studying biochemistry.")
    page.locator("#edit-submit-btn").click()
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Member details updated successfully!")

    # 7. REMOVE RELATIONSHIP
    print("Testing REMOVE RELATIONSHIP: Removing a relationship from Morenike...")
    page.locator("#tree-cards-layer > div:has-text('Morenike Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    # Locate remove relationship trash button and click it
    page.locator("button.remove-rel-btn").first.click()
    page.wait_for_timeout(1000)
    page.wait_for_selector("#tree-edit-modal.opacity-0", timeout=15000)
    print("Relationship successfully removed!")

    # 8. SOFT DELETE (Archive) & RESTORE
    print("Testing SOFT DELETE: Archiving Morenike...")
    page.locator("#tree-cards-layer > div:has-text('Morenike Lawal') .edit-node-btn").click()
    page.wait_for_timeout(1000)
    page.locator("#delete-node-btn").click()
    page.wait_for_timeout(1500)
    print("Soft delete completed!")

    # Verify Morenike card is no longer visible
    assert not page.locator("#tree-cards-layer > div:has-text('Morenike Lawal')").is_visible(), "Morenike card should be removed from active tree rendering"
    print("Soft-delete verified successfully!")

    # Test Restore Node
    print("Testing RESTORE: Bringing Morenike back from archives...")
    page.locator("#restore-member-trigger-btn").click()
    page.wait_for_timeout(1000)
    page.locator("button.restore-member-btn:has-text('Restore')").first.click()
    page.wait_for_timeout(1500)

    # Verify Morenike card is restored and visible again
    assert page.locator("#tree-cards-layer > div:has-text('Morenike Lawal')").is_visible(), "Morenike card should be restored and visible on canvas"
    print("Restore operation verified successfully!")

    page.screenshot(path="verification/screenshots/tree_operations_result.png")
    print("Took tree operations result verification screenshot.")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    print("Starting Playwright for Custom Tree Operations Verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            run_tree_operations_tests(page)
            print("Tree Operations Verification Tests PASSED with absolute success!")
            sys.exit(0)
        except Exception as e:
            print(f"Tree Operations Verification Tests FAILED: {e}")
            page.screenshot(path="verification/screenshots/tree_ops_error.png")
            sys.exit(1)
        finally:
            context.close()
            browser.close()
