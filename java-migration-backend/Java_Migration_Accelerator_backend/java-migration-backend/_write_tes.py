target = r"services/testing/test_execution_service.py"
src = open("services/testing/test_execution_service.py", "r", encoding="utf-8").read()
print("Current lines:", src.count("\n"))
print("Already replaced?", "MAX_TEST_REPAIR_RETRIES" in src)
