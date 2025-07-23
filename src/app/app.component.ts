// src/app/app.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

// Core imports
import { Univer, ICommandService, IDataValidationRule, IDisposable, ICellData, Nullable } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverSheetsPlugin, SetRangeValuesMutation, ISetRangeValuesMutationParams } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsDataValidationPlugin } from '@univerjs/sheets-data-validation';

// --- FINAL FIX --- This is the correct package that provides the editor service.
import { UniverDocsPlugin } from '@univerjs/docs';

// Our mock service
import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'univer-dynamic-dropdown';
  univer!: Univer;
  commandListener: IDisposable | null = null;

  @ViewChild('univerContainer', { static: true }) univerContainer!: ElementRef;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.initUniver();
  }

  ngOnDestroy(): void {
    this.univer?.dispose();
    this.commandListener?.dispose();
  }

  async initUniver() {
    const univer = new Univer({ theme: defaultTheme });
    this.univer = univer;

    // Register plugins. The order is important.
    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverFormulaEnginePlugin);
    univer.registerPlugin(UniverUIPlugin);

    // --- FINAL FIX --- Register the UniverDocsPlugin which provides the editor capabilities.
    univer.registerPlugin(UniverDocsPlugin);

    // Business plugins
    univer.registerPlugin(UniverSheetsPlugin);
    univer.registerPlugin(UniverSheetsUIPlugin);
    univer.registerPlugin(UniverSheetsFormulaPlugin);
    univer.registerPlugin(UniverSheetsDataValidationPlugin);

    // Create the spreadsheet
    univer.createUniverSheet({
      id: 'workbook-01',
      sheets: { 'sheet-01': { id: 'sheet-01', cellData: { '1': { '0': { v: 'Click Me for Dropdown' } } } } }
    });

    const injector = univer.__getInjector();
    const commandService = injector.get(ICommandService);

    await this.applyDataValidation(commandService);
    this.listenForCellValueChanges(commandService);
  }

  async applyDataValidation(commandService: ICommandService) {
    const options = await this.dataService.getDropdownOptions();
    const dataValidationRule: IDataValidationRule = {
      uid: `rule-${Date.now()}`,
      type: 'list',
      formula1: options.join(','),
      ranges: [{ startRow: 1, endRow: 10, startColumn: 0, endColumn: 0 }],
    };
    const params = {
      unitId: 'workbook-01',
      subUnitId: 'sheet-01',
      rule: dataValidationRule,
    };
    const ADD_DATA_VALIDATION_MUTATION_ID = 'sheet.mutation.add-data-validation';
    commandService.executeCommand(ADD_DATA_VALIDATION_MUTATION_ID, params);
    console.log('CLIENT: Dropdown data validation rule applied to Column A.');
  }

  listenForCellValueChanges(commandService: ICommandService) {
    this.commandListener = commandService.onCommandExecuted((commandInfo) => {
      if (commandInfo.id === SetRangeValuesMutation.id) {
        const params = commandInfo.params as ISetRangeValuesMutationParams;
        const cellMatrix = params.cellValue as any;
        if (!cellMatrix) return;
        for (const row in cellMatrix) {
          for (const col in cellMatrix[row]) {
            const cellData = cellMatrix[row][col];
            if (cellData && cellData.v !== undefined) {
              const value = cellData.v;
              console.log(`CLIENT: User changed cell (row: ${row}, col: ${col}) to "${value}".`);
              this.dataService.saveCellValue(value, Number(row), Number(col));
            }
          }
        }
      }
    });
  }
}