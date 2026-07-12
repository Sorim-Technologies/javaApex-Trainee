import asyncio
from services.testing.test_generator import TestGenerator as Generator

class Client:
    def __init__(self, code): self.code, self.calls = code, 0
    async def fix_compilation_errors(self, **kwargs):
        self.calls += 1
        assert all(kwargs.values())
        return self.code

def test_generated_test_is_repaired_independently(tmp_path):
    path = tmp_path / "src/test/java/demo/ExampleTest.java"
    path.parent.mkdir(parents=True)
    path.write_text("package demo; class ExampleTest { void bad() {} }", encoding="utf-8")
    fixed = "package demo; class ExampleTest { void fixed() {} }"
    generator = Generator()
    generator.client = Client(fixed)
    outcomes = iter([(False, "ExampleTest.java:[1,34] error: cannot find symbol"), (True, "")])
    async def compile_one(*args): return next(outcomes)
    generator._compile_single_generated_test = compile_one
    info = {"test_file_path": str(path), "test_class_name": "ExampleTest", "java_source": "class Example {}", "class_meta": {"package_name": "demo"}}
    compiled, attempts = asyncio.run(generator._compile_and_repair_generated_test(str(tmp_path), "maven", info, lambda msg: None))
    assert (compiled, attempts) == (True, 1)
    assert path.read_text(encoding="utf-8") == fixed

def test_unrepairable_test_stops_after_five_attempts(tmp_path):
    path = tmp_path / "src/test/java/demo/FailingTest.java"
    path.parent.mkdir(parents=True)
    path.write_text("package demo; class FailingTest {}", encoding="utf-8")
    generator = Generator(); generator.max_retries = 5
    generator.client = Client(path.read_text(encoding="utf-8"))
    async def fail(*args): return False, "FailingTest.java:[1,21] error: cannot find symbol"
    generator._compile_single_generated_test = fail
    info = {"test_file_path": str(path), "test_class_name": "FailingTest", "java_source": "class Example {}", "class_meta": {"package_name": "demo"}}
    assert asyncio.run(generator._compile_and_repair_generated_test(str(tmp_path), "maven", info, lambda msg: None)) == (False, 5)
    assert generator.client.calls == 5
