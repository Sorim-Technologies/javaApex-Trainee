import os

# Create directories
os.makedirs(r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\main\java\com\example", exist_ok=True)
os.makedirs(r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\test\java\com\example", exist_ok=True)

# Write Calculator.java
with open(r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\main\java\com\example\Calculator.java", "w", encoding="utf-8") as f:
    f.write("""package com.example;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
}
""")

# Write CalculatorTest.java
with open(r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\test\java\com\example\CalculatorTest.java", "w", encoding="utf-8") as f:
    f.write("""package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class CalculatorTest {
    @Test
    public void testAdd() {
        Calculator calc = new Calculator();
        assertEquals(5, calc.add(2, 3));
    }
}
""")

print("Calculator files created successfully!")
