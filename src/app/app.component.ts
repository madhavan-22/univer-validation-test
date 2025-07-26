// src/app/app.component.ts

import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import {
    Univer,
    ICommandService,
    IUniverInstanceService,
    type IWorkbookData,
    LocaleType,
} from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverUIPlugin } from '@univerjs/ui';
// We do NOT import DataValidationRuleType from here anymore
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';

// We only import the plugin and the mutation command
import {
    UniverDataValidationPlugin,
    AddDataValidationMutation,
} from '@univerjs/data-validation';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
    @ViewChild('univerContainer') univerContainer!: ElementRef;
    univer!: Univer;
    workbookId = 'workbook-demo-checkbox';

    ngAfterViewInit(): void {
        const workbookData = this.createDemoWorkbookData();
        this.univer = new Univer({ theme: defaultTheme });

        // Register plugins
        this.univer.registerPlugin(UniverRenderEnginePlugin);
        this.univer.registerPlugin(UniverFormulaEnginePlugin);
        this.univer.registerPlugin(UniverUIPlugin, {
            container: this.univerContainer.nativeElement,
            header: true,
            footer: true,
        });
        this.univer.registerPlugin(UniverSheetsPlugin);
        this.univer.registerPlugin(UniverSheetsUIPlugin);
        this.univer.registerPlugin(UniverSheetsFormulaPlugin);
        this.univer.registerPlugin(UniverDataValidationPlugin);

        this.univer.createUniverSheet(workbookData);
        this.addCheckboxValidation();
    }

    private addCheckboxValidation(): void {
        const injector = this.univer.__getInjector();
        const commandService = injector.get(ICommandService);
        const univerInstanceService = injector.get(IUniverInstanceService);

        // **FIX for the error:** Use `getUniverSheetInstance` with an ID
        const workbook = univerInstanceService.getUniverSheetInstance(this.workbookId);

        if (!workbook) return;
        const worksheet = workbook.getActiveSheet();
        if (!worksheet) return;

        const unitId = workbook.getUnitId();
        const subUnitId = worksheet.getSheetId();

        commandService.executeCommand(AddDataValidationMutation.id, {
            unitId,
            subUnitId,
            rule: {
                // **FIX for the other error:** Use a simple string literal
                type: 'checkbox',
                ranges: [{ startRow: 0, endRow: 2, startColumn: 0, endColumn: 0 }],
                rule: {
                    checkedValue: true,
                    uncheckedValue: false,
                },
            },
        });
    }

    private createDemoWorkbookData(): IWorkbookData {
        return {
            id: this.workbookId,
            name: 'Univer Docs',
            appVersion: '3.0.0-alpha',
            locale: LocaleType.EN_US,
            styles: {},
            sheetOrder: ['sheet-01'],
            sheets: {
                'sheet-01': {
                    id: 'sheet-01',
                    name: 'To-Do List',
                    cellData: {
                        '0': { '0': { v: true }, '1': { v: 'Write report' } },
                        '1': { '0': { v: false }, '1': { v: 'Email the team' } },
                        '2': { '0': { v: false }, '1': { v: 'Schedule meeting' } },
                    },
                },
            },
        };
    }
}