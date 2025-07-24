// src/app/app.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';

// --- ALL CORRECT IMPORTS FOR A FULL UI INSTANCE ---
import {
    Univer, ICommandService, IDataValidationRule, IDisposable, ICommandInfo,
    LifecycleService, LifecycleStages, LocaleService, LocaleType
} from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverSheetsPlugin, SetRangeValuesMutation, ISetRangeValuesMutationParams } from '@univerjs/sheets';
import { UniverSheetsDataValidationPlugin } from '@univerjs/sheets-data-validation';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDrawingPlugin } from '@univerjs/drawing';
import { UniverDrawingUIPlugin } from '@univerjs/drawing-ui';

import { DataService } from './data.service';

// --- DEFINITIVE FIX ---
// Since `enUS` is not exported from any package in version 0.9.3, we provide a minimal
// locale object to satisfy the LocaleService and prevent the initialization crash.
const enUS = {
    "sheet": { "toolbar": { "undo": "Undo", "redo": "Redo" } },
    "shortcut": { "sheet": { "undo": "Undo" } }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'univer-dynamic-dropdown';
  univer!: Univer;
  commandListener: IDisposable | null = null;
  lifecycleSubscription: Subscription | null = null;

  @ViewChild('univerContainer', { static: true }) univerContainer!: ElementRef;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.initUniver();
  }

  ngOnDestroy(): void {
    this.univer?.dispose();
    this.commandListener?.dispose();
    this.lifecycleSubscription?.unsubscribe();
  }

  initUniver() {
    // 1. Create the Univer instance.
    const univer = new Univer({
        theme: defaultTheme,
        locale: LocaleType.EN_US,
    });
    this.univer = univer;

    // 2. Load the minimal, manually-defined locale data. This is the most critical step.
    const injector = univer.__getInjector();
    const localeService = injector.get(LocaleService);
    localeService.load({ enUS });

    // 3. Register the complete set of plugins for a full-featured sheet application.
    // The order is critical for dependency injection.
    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverFormulaEnginePlugin);
    univer.registerPlugin(UniverUIPlugin);
    univer.registerPlugin(UniverDocsPlugin);
    univer.registerPlugin(UniverDocsUIPlugin);
    univer.registerPlugin(UniverSheetsPlugin);
    univer.registerPlugin(UniverSheetsUIPlugin);
    univer.registerPlugin(UniverSheetsFormulaPlugin);

    // Register the undocumented dependencies for Data Validation
    univer.registerPlugin(UniverDrawingPlugin);
    univer.registerPlugin(UniverDrawingUIPlugin);

    // Register our feature plugin LAST
    univer.registerPlugin(UniverSheetsDataValidationPlugin);

    // 4. Create the spreadsheet.
    univer.createUniverSheet({
      id: 'workbook-01',
      sheets: { 'sheet-01': { id: 'sheet-01', cellData: { '0': { '0': { v: 'Task Status' } } } } }
    });

    const commandService = injector.get(ICommandService);
    const lifecycleService = injector.get(LifecycleService);

    // 5. Use the lifecycle hook to ensure everything is ready.
    this.lifecycleSubscription = lifecycleService
        .subscribeWithPrevious()
        .subscribe(async (stage) => {
            if (stage === LifecycleStages.Ready) {
                await this.applyDataValidation(commandService);
                this.listenForCellValueChanges(commandService);
                this.lifecycleSubscription?.unsubscribe();
            }
        });
  }

  async applyDataValidation(commandService: ICommandService) {
    const options = await this.dataService.getDropdownOptions();
    const dataValidationRule: IDataValidationRule = {
      uid: `rule-${Date.now()}`,
      type: 'list',
      formula1: options.join(','),
      ranges: [{ startRow: 0, endRow: 10, startColumn: 0, endColumn: 0 }],
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
    this.commandListener = commandService.onCommandExecuted((commandInfo: ICommandInfo) => {
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