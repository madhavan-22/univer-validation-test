// src/app/data.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  /**
   * Simulates fetching dropdown options from a database.
   * @returns A promise that resolves to an array of strings.
   */
  async getDropdownOptions(): Promise<string[]> {
    console.log('DATABASE: Fetching dropdown options...');
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500)); 
    const options = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    console.log('DATABASE: Options received:', options);
    return options;
  }

  /**
   * Simulates saving a new cell value to the database.
   * @param value The new value of the cell.
   * @param row The row index of the cell.
   * @param col The column index of the cell.
   */
  async saveCellValue(value: any, row: number, col: number): Promise<void> {
    console.log(`DATABASE: Saving value "${value}" for cell at (row: ${row}, col: ${col})...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('DATABASE: Save successful!');
    // In a real app, you would make an HTTP POST/PUT request here.
  }
}