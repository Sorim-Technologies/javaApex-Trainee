package com.example;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class CalculatorTest {
  private final Calculator calculator = new Calculator();
  @Test void arithmeticOperations() {
    assertEquals(5, calculator.add(2, 3));
    assertEquals(1, calculator.subtract(3, 2));
    assertEquals(6, calculator.multiply(2, 3));
    assertEquals(2.5, calculator.divide(5, 2));
  }
  @Test void divideByZeroIsRejected() {
    assertThrows(IllegalArgumentException.class, () -> calculator.divide(1, 0));
  }
}
