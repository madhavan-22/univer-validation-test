// src/app/app.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';

// --- Official Imports ---
import {
    Univer, ICommandService, IDataValidationRule, IDisposable, ICommandInfo,
    LifecycleService, LifecycleStages, LocaleType, UniverInstanceType
} from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverSheetsPlugin, SetRangeValuesMutation, ISetRangeValuesMutationParams } from '@univerjs/sheets';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDrawingPlugin } from '@univerjs/drawing';
import { UniverDrawingUIPlugin } from '@univerjs/drawing-ui';
import { UniverSheetsDataValidationPlugin, AddSheetDataValidationCommand } from '@univerjs/sheets-data-validation';
import { UniverSheetsDataValidationUIPlugin } from '@univerjs/sheets-data-validation-ui';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';

// The deep-import for the locale data
import UniverDesignEnUS from '@univerjs/design/lib/locale/en-US';
import UniverDocsUIEnUS from '@univerjs/docs-ui/lib/locale/en-US';
import UniverSheetsEnUS from '@univerjs/sheets-ui/lib/locale/en-US';
import UniverUIEnUS from '@univerjs/ui/lib/locale/en-US';
import UniverSheetsDataValidationEnUS from '@univerjs/sheets-data-validation-ui/lib/locale/en-US';
import UniverSheetsFormulaEnUS from '@univerjs/sheets-formula-ui/lib/locale/en-US';

import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'univer-dynamic-dropdown';
  univer!: Univer;
  commandListener: IDisposable | null = null;
  lifecycleSubscription: Subscription | null = null;

  // This will now correctly find the <div #univerContainer> in the HTML
  @ViewChild('univerContainer') univerContainer!: ElementRef;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // We initialize here to guarantee the `univerContainer` element exists and is sized correctly.
    this.initUniver();
  }

  ngOnDestroy(): void {
    this.univer?.dispose();
    this.commandListener?.dispose();
    this.lifecycleSubscription?.unsubscribe();
  }

  initUniver() {
    const enUS = {
        ...UniverSheetsEnUS,
        ...UniverDocsUIEnUS,
        ...UniverDesignEnUS,
        ...UniverUIEnUS,
        ...UniverSheetsDataValidationEnUS,
        ...UniverSheetsFormulaEnUS,
    };

    const univer = new Univer({
        theme: defaultTheme,
        locale: LocaleType.EN_US,
        locales: {
            [LocaleType.EN_US]: enUS,
        },
    });
    this.univer = univer;

    const injector = univer.__getInjector();

    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverFormulaEnginePlugin);
    
    // Pass the actual HTML element to the container. This only works inside ngAfterViewInit.
    univer.registerPlugin(UniverUIPlugin, {
        container: this.univerContainer.nativeElement,
    });

    univer.registerPlugin(UniverDocsPlugin);
    univer.registerPlugin(UniverDocsUIPlugin);
    univer.registerPlugin(UniverSheetsPlugin);
    univer.registerPlugin(UniverSheetsUIPlugin);
    univer.registerPlugin(UniverSheetsFormulaPlugin);
    univer.registerPlugin(UniverDrawingPlugin);
    univer.registerPlugin(UniverDrawingUIPlugin);
    univer.registerPlugin(UniverSheetsDataValidationPlugin);
    univer.registerPlugin(UniverSheetsFormulaUIPlugin);
    univer.registerPlugin(UniverSheetsDataValidationUIPlugin);

    univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
      id: 'workbook-01',
      sheets: {
        'sheet-01': {
          id: 'sheet-01',
          rowCount: 1000,
          columnCount: 26,
          cellData: {
            '0': { '0': { v: 'Task Status' } },
            '1': { '0': { v: 'Pending' } } // Use a valid initial value
          }
        }
      }
    });

    const commandService = injector.get(ICommandService);
    const lifecycleService = injector.get(LifecycleService);

    this.lifecycleSubscription = lifecycleService
        .subscribeWithPrevious()
        .subscribe(async (stage: LifecycleStages) => {
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
      ranges: [{ startRow: 1, endRow: 1000, startColumn: 0, endColumn: 0 }],
    };
    const params = {
      unitId: 'workbook-01',
      subUnitId: 'sheet-01',
      rule: dataValidationRule,
    };
    commandService.executeCommand(AddSheetDataValidationCommand.id, params);
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