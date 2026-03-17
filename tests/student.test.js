const fs = require('fs');
const path = require('path');

describe('Student ID Validation', () => {
  const studentIdPath = path.join(__dirname, '../student_id.txt');

  test('student_id.txt file should exist', () => {
    expect(fs.existsSync(studentIdPath)).toBe(true);
  });

  test('student ID should start with 65', () => {
    const studentId = fs.readFileSync(studentIdPath, 'utf-8').trim();
    expect(studentId.startsWith('65')).toBe(true);
  });

  test('student ID should be exactly 11 digits', () => {
    const studentId = fs.readFileSync(studentIdPath, 'utf-8').trim();
    expect(studentId).toMatch(/^\d{11}$/);
  });

  test('student ID should be all numeric', () => {
    const studentId = fs.readFileSync(studentIdPath, 'utf-8').trim();
    expect(/^\d+$/.test(studentId)).toBe(true);
  });

  test('student ID should match the pattern 65XXXXXXXXX (11 digits total)', () => {
    const studentId = fs.readFileSync(studentIdPath, 'utf-8').trim();
    expect(studentId).toMatch(/^65\d{9}$/);
  });
});