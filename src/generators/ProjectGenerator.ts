import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    type: 'webapp' | 'library' | 'control' | 'fullstack';
    ui5Version: string;
}

export class ProjectGenerator {
    private templates: ProjectTemplate[] = [
        {
            id: 'basic-webapp',
            name: 'Basic SAPUI5 Web Application',
            description: 'Simple SAPUI5 application with MVC pattern',
            type: 'webapp',
            ui5Version: '1.108.0'
        },
        {
            id: 'fiori-master-detail',
            name: 'SAP Fiori Master-Detail Application',
            description: 'Fiori application with master-detail pattern',
            type: 'webapp',
            ui5Version: '1.108.0'
        },
        {
            id: 'custom-control',
            name: 'Custom UI5 Control Library',
            description: 'Library project for custom UI5 controls',
            type: 'library',
            ui5Version: '1.108.0'
        }
    ];

    getTemplates(): ProjectTemplate[] {
        return this.templates;
    }

    async createProject(template: ProjectTemplate, projectPath: string, projectName: string) {
        // Create project structure
        const dirs = [
            'webapp',
            'webapp/controller',
            'webapp/view',
            'webapp/model',
            'webapp/css',
            'webapp/i18n'
        ];

        // Create directories
        for (const dir of dirs) {
            const fullPath = path.join(projectPath, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }

        // Generate files based on template
        await this.generatePackageJson(projectPath, projectName, template);
        await this.generateManifest(projectPath, projectName, template);
        await this.generateIndexHtml(projectPath, projectName, template);
        await this.generateComponent(projectPath, projectName);
        await this.generateMainController(projectPath, projectName);
        await this.generateMainView(projectPath, projectName);
        await this.generateI18n(projectPath);
        await this.generateGitignore(projectPath);
        
        vscode.window.showInformationMessage(
            `Project "${projectName}" created successfully!`,
            'Open Project'
        ).then(selection => {
            if (selection === 'Open Project') {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
            }
        });
    }

    private async generatePackageJson(projectPath: string, projectName: string, template: ProjectTemplate) {
        const packageJson = {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            description: `${projectName} - ${template.description}`,
            scripts: {
                'start': 'ui5 serve -o index.html',
                'build': 'ui5 build --clean-dest',
                'lint': 'eslint webapp'
            },
            devDependencies: {
                '@ui5/cli': '^3.0.0',
                '@sap/ux-ui5-tooling': '^1.11.0',
                'eslint': '^8.0.0'
            }
        };

        fs.writeFileSync(
            path.join(projectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
    }

    private async generateManifest(projectPath: string, projectName: string, template: ProjectTemplate) {
        const namespace = projectName.toLowerCase().replace(/\s+/g, '');
        const manifest = {
            '_version': '1.32.0',
            'sap.app': {
                id: `com.company.${namespace}`,
                type: 'application',
                i18n: 'i18n/i18n.properties',
                title: '{{appTitle}}',
                description: '{{appDescription}}',
                applicationVersion: {
                    version: '1.0.0'
                }
            },
            'sap.ui': {
                technology: 'UI5',
                deviceTypes: {
                    desktop: true,
                    tablet: true,
                    phone: true
                }
            },
            'sap.ui5': {
                flexEnabled: true,
                rootView: {
                    viewName: `${namespace}.view.Main`,
                    type: 'XML',
                    async: true,
                    id: 'app'
                },
                dependencies: {
                    minUI5Version: template.ui5Version,
                    libs: {
                        'sap.m': {},
                        'sap.ui.core': {}
                    }
                },
                contentDensities: {
                    compact: true,
                    cozy: true
                },
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: {
                            bundleName: `${namespace}.i18n.i18n`
                        }
                    }
                }
            }
        };

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
    }

    private async generateIndexHtml(projectPath: string, projectName: string, template: ProjectTemplate) {
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    
    <script id="sap-ui-bootstrap"
        src="https://ui5.sap.com/${template.ui5Version}/resources/sap-ui-core.js"
        data-sap-ui-theme="sap_fiori_3"
        data-sap-ui-resourceroots='{
            "${projectName.toLowerCase().replace(/\s+/g, '')}": "./"
        }'
        data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-async="true"
        data-sap-ui-frameOptions="trusted">
    </script>
</head>
<body class="sapUiBody">
    <div data-sap-ui-component 
         data-name="${projectName.toLowerCase().replace(/\s+/g, '')}" 
         data-id="container" 
         data-settings='{"id": "${projectName.toLowerCase().replace(/\s+/g, '')}"}'>
    </div>
</body>
</html>`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'index.html'),
            html
        );
    }

    private async generateComponent(projectPath: string, projectName: string) {
        const namespace = projectName.toLowerCase().replace(/\s+/g, '');
        const component = `sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "${namespace}/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("${namespace}.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();
            this.setModel(models.createDeviceModel(), "device");
        }
    });
});`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'Component.js'),
            component
        );

        // Create models.js
        const models = `sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {
        createDeviceModel: function () {
            const oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };
});`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'model', 'models.js'),
            models
        );
    }

    private async generateMainController(projectPath: string, projectName: string) {
        const namespace = projectName.toLowerCase().replace(/\s+/g, '');
        const controller = `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("${namespace}.controller.Main", {
        onInit: function () {
            // Initialization code here
        },

        onPress: function () {
            MessageToast.show("Hello from ${projectName}!");
        }
    });
});`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'controller', 'Main.controller.js'),
            controller
        );
    }

    private async generateMainView(projectPath: string, projectName: string) {
        const namespace = projectName.toLowerCase().replace(/\s+/g, '');
        const view = `<mvc:View
    controllerName="${namespace}.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    displayBlock="true"
    xmlns="sap.m">
    
    <Shell id="shell">
        <App id="app">
            <pages>
                <Page id="page" title="{i18n>title}">
                    <content>
                        <FlexBox
                            alignItems="Center"
                            justifyContent="Center"
                            height="400px">
                            <VBox alignItems="Center">
                                <Title text="Welcome to ${projectName}" level="H1" />
                                <Button
                                    text="{i18n>btnText}"
                                    press=".onPress"
                                    type="Emphasized" />
                            </VBox>
                        </FlexBox>
                    </content>
                </Page>
            </pages>
        </App>
    </Shell>
</mvc:View>`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'view', 'Main.view.xml'),
            view
        );
    }

    private async generateI18n(projectPath: string) {
        const i18n = `# App Descriptor
appTitle=SAPUI5 Application
appDescription=A new SAPUI5 application

# Main View
title=Home
btnText=Click Me`;

        fs.writeFileSync(
            path.join(projectPath, 'webapp', 'i18n', 'i18n.properties'),
            i18n
        );
    }

    private async generateGitignore(projectPath: string) {
        const gitignore = `node_modules/
dist/
.DS_Store
*.log`;

        fs.writeFileSync(
            path.join(projectPath, '.gitignore'),
            gitignore
        );
    }
}
