// Copyright (c) 2022 Ulf Carlström
import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const css = require('css');

enum DisplayOption{
    Nothing= <any>'Nothing',
    EmptyLine = <any>'EmptyLine',
    GroupName = <any>'GroupName'
}
export class CssOrganizer{
    context : vscode.ExtensionContext;
    userGroupSorter: GroupSorter | null = null;
    currentGroupSorter: GroupSorter | null = null;

    constructor(context : vscode.ExtensionContext) {
        this.context = context;
    }

    registerCmd(name:string, fn:any){
        let disposable = vscode.commands.registerCommand(name, fn);
        this.context.subscriptions.push(disposable);
    }

    info(msg: string, ...items: string[]) {vscode.window.showInformationMessage(msg,...items);}

    warning(msg: string, ...items: string[]) {vscode.window.showWarningMessage(msg,...items);}

    error(msg: string, ...items: string[]) {vscode.window.showErrorMessage(msg,...items);}

    organizeAlphabetically() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {return;}
        const ast = AST.fromText(editor.document);

        if (ast){
            const rules = ast.pickRulesFrom(editor.selection);
            rules.forEach( (r:any):Rule => r.sortAlpha());
            editor.edit( (edit: vscode.TextEditorEdit) =>{
                rules.reverse().forEach((r:Rule):void => {
                    edit.replace(r.getReplaceRange(),r.getAlphaSortedSource(this.currentGroupSorter?.groupTitles || []));
                });
            } );        
        }
    }

    getDisplayOption():DisplayOption| undefined{
        const displayOption:DisplayOption | undefined = vscode.workspace.getConfiguration().get('css-organizer.displayOption');
        return displayOption;
    }

    getUserDefinedGroupsFile():string | null{
        return vscode.workspace.getConfiguration().get('css-organizer.userGroupingFile') as string;
    }

    getUseUserDefinedGroups():boolean | null{
        return vscode.workspace.getConfiguration().get('css-organizer.userGroupingFileUse') as boolean;
    }

    organizeGrouped() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {return;}
        const ast = AST.fromText(editor.document);
        
        if (ast){
            const rules = ast.pickRulesFrom(editor.selection);
            const displayOption:DisplayOption| undefined = this.getDisplayOption();
            console.log(displayOption);
                     
            if (! this.currentGroupSorter){
                this.error("No group sorter available. Maybe the group definition JSON file didn't load OK. See earlier error messages");
                return;
            }
            rules.forEach( (r:Rule) => r.sortFrom(this.currentGroupSorter,displayOption));
            
            editor.edit( (edit: vscode.TextEditorEdit) =>{
                rules.reverse().forEach((r:Rule,i:number,arr):void => {
                    edit.replace(r.getReplaceRange(),i === arr.length -1 ?r.groupSortedSrc.trimEnd(): r.groupSortedSrc);
                });                
            });        
        }     
    }

    loadGroupSorters(context:vscode.ExtensionContext){
        const defaultJsonPath = path.join(context.extensionPath,'resources','default-grouping.json');
        console.log(context.extensionPath);
        
        try {
            const defaultJsonRaw = fs.readFileSync(defaultJsonPath);
            const defaultJsonObject = JSON.parse(defaultJsonRaw);
            this.userGroupSorter = new GroupSorter(defaultJsonObject);
            this.currentGroupSorter = this.userGroupSorter;
            
        } catch (error:any) {
            if(error.code === 'ENOENT'){
                this.error("Failed to load default CSS group definition file ",defaultJsonPath);
                return;
            }
            this.error(error);
        }

        if (this.getUseUserDefinedGroups()){
            const userJsonPath = path.join( 
                context.extensionPath,
                'resources',
                this.getUserDefinedGroupsFile());
            console.log(userJsonPath);
            
            try {
                const userJsonRaw = fs.readFileSync(userJsonPath);
                const userJsonObject = JSON.parse(userJsonRaw);
                this.userGroupSorter = new GroupSorter(userJsonObject);
                this.currentGroupSorter = this.userGroupSorter;
                
            } catch (error:any) {
                if(error.code === 'ENOENT'){
                    this.error("Failed to load user CSS group definition file ",userJsonPath);
                    return;
                }
                this.error("Failed to parse user CSS group definition file. Will use default. User file: ",userJsonPath);
            }
        }
        

    }
    
}

class AST{
    static fromText(doc:vscode.TextDocument){
        const text:string = doc.getText();
        if (!text) {return null;}
        const ast = css.parse(text);
        if (!ast) {return null;}
        return new AST(ast,doc);
    }
    static  RULE_CONTAINING_TYPES = ['document','host','media','supports'];

    astData:any;
    doc:vscode.TextDocument;
    rules:any[];

    constructor(ast:any,doc:vscode.TextDocument){
        this.astData = ast;
        this.doc = doc;
        this.rules = this.astData.stylesheet.rules.filter((r:any) => r.type ==='rule' || AST.RULE_CONTAINING_TYPES.includes( r.type))
            .map((r:any):Rule =>{
                if (AST.RULE_CONTAINING_TYPES.includes( r.type)) { 
                    return r.rules.map( (rr:any) => new Rule(rr)); 
                }
                return new Rule(r);
            });
    }

    getRules(){
        return this.astData.stylesheet.rules;
    }

    pickRuleAt(pos:vscode.Position) : Array<Rule | null> {
        const found: Rule | null = this.rules.find(r=> r.range.contains(pos));
        found?.setSourceFrom(this.doc);
        return [found];
    }

    pickRulesFrom(selection:vscode.Selection){
        if (selection.isEmpty){
            const found: Rule | null = this.rules.find(r=> r.range.contains(selection.active));
            found?.setSourceFrom(this.doc);
            return [found];            
        }

        const pickedRules =  this.rules.filter(r=> selection.contains(r.start) || 
                                     selection.contains(r.end) ||
                                     r.range.contains(selection.active)||
                                     r.range.contains(selection.anchor));
        pickedRules.forEach(r=>r.setSourceFrom(this.doc));
        return pickedRules;
    }
}

class Rule{
    ruleObject:any;
    start : vscode.Position;
    end : vscode.Position;
    range : vscode.Range;
    src: string = '';
    decs:any[] = [];
    newDecSource: string = '';
    groupSortedSrc: string = '';
    
    constructor(ruleObject:any){
        this.ruleObject = ruleObject;
        this.start = new vscode.Position(this.ruleObject.position.start.line -1,this.ruleObject.position.start.column);
        this.end = new vscode.Position(this.ruleObject.position.end.line -1,this.ruleObject.position.end.column);
        this.range =  new vscode.Range(this.start,this.end);
        if (this.ruleObject.declarations) {
            this.decs = this.ruleObject.declarations.map((d:any):Declaration => new Declaration(d));
        }
    }

    setSourceFrom(doc:vscode.TextDocument){
        this.src = doc.getText(this.range);
        this.decs.forEach(d=>d.setSourceFrom(doc));
    }

    sortAlpha(){
        this.decs.sort((a:any,b:any):number=>{
            const aSrc=a.src.trim();
            const bSrc=b.src.trim();
            if (aSrc > bSrc) { return 1; }
            if (aSrc < bSrc) { return -1; }
            return 0;
        });
    }

    sortFrom(groupSorter:GroupSorter|null,displayOption:DisplayOption| undefined){
        if (!groupSorter)return;
        groupSorter.clear();
        this.decs.forEach(d=> groupSorter.put(d));
        groupSorter.sortProperties();
        this.groupSortedSrc = groupSorter.getSource(displayOption);
    }

    getReplaceRange() : vscode.Range{
        const minLineNr = this.decs.reduce((p,c)=>{
            return p.start.line < c.start.line ? p : c;
        }).start.line;

        const maxLine = this.decs.reduce((p,c)=>{
            return p.end.line > c.end.line ? p : c;
        }).end;
        const maxLineNr = maxLine.line;
        const maxLineCharNr = maxLine.character+1;

        return new vscode.Range(    new vscode.Position(minLineNr,0), 
                                    new vscode.Position(maxLineNr,maxLineCharNr));     
    }

    getAlphaSortedSource(groupTitles:string[]){
        const decsSrc = this.decs.reduce((p,c)=>{
            if (groupTitles.includes(c.decObject.comment)){return p;}
            return p + c.src+'\n';
             
        },'').trimEnd();
        return decsSrc;        
    }
}

class RuleEntry {
    src: string = '';
}
class Declaration extends RuleEntry{

    decObject:any;
    propName : string;
    start : vscode.Position;
    end : vscode.Position;
    range : vscode.Range;

    constructor(decObject:any){
        super();
        this.decObject = decObject;
        this.propName = decObject.property;
        this.start = new vscode.Position(this.decObject.position.start.line -1,this.decObject.position.start.column-1);
        this.end = new vscode.Position(this.decObject.position.end.line -1,this.decObject.position.end.column-1);
        this.range =  new vscode.Range(this.start,this.end);
    }

    setSourceFrom(doc:vscode.TextDocument){
        this.src='';
        range(this.start.line,this.end.line).forEach((line)=> {
            this.src += doc.lineAt(line).text;
        });
    }
}

function range(start:number, end:number) {
    var ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}

class GroupSorter {

    title:string;
    description:string;
    groups:Group[] = [];
    groupTitles:string[] = [];
    miscGroup:Group;

    constructor(jsonObject:any){
        this.title = jsonObject.title || "Missing title";
        this.description = jsonObject.description || "";
        if (jsonObject.groups){
            jsonObject.groups.forEach((g:any)=> {
                const group = new Group(g);
                this.groups.push(group);
                this.groupTitles.push(group.title);
            });
        }
        this.miscGroup = new Group({name:"misc",title:"Miscellaneous",properties:[]});
        this.groups.push(this.miscGroup);
        this.groupTitles.push(this.miscGroup.title);
    }

    getGroupFor(propName:string):Group{
        if (!propName) {return this.miscGroup;}
        for (const group of this.groups)
        {
            for (const name of group.propertyNames) {
                if (propName === name) {return group;}
            }
        }
        return this.miscGroup;
    }

    put(dec:Declaration){
        const group = this.getGroupFor(dec.propName);
        if (this.groupTitles.includes(dec.decObject.comment)){return;}
        group.put(dec);
    }

    sortProperties(){
        this.groups.forEach(g=>g.sort());
    }

    getSource(displayOption:DisplayOption| undefined) : string {
        const ruleSrc =this.groups.reduce((p,c)=>{
            return p + c.getSource(displayOption);           
        },'');

        return ruleSrc.trimEnd();
    }

    clear(){
        this.groups.forEach(g=>g.clear());
    }
}
class Group{

    name:string;
    title:string;
    propertyNames:string[] = [];
    propertyDeclarations: Declaration[] = [];

    constructor(jsonObject:any){
        this.name = jsonObject.name || "Missing name";
        this.title = jsonObject.title || this.name;
        if (jsonObject.properties){
            jsonObject.properties.forEach((p:any)=> this.propertyNames.push(p));
        }

    }

    put(dec:Declaration){
        this.propertyDeclarations.push(dec);
    }

    sort(){
        if (this.propertyNames.length === 0){return;}

        this.propertyDeclarations.sort((a:any,b:any):number=>{
            if (this.propertyNames.includes(a.decObject.property) && this.propertyNames.includes(b.decObject.property)){
                return this.propertyNames.indexOf(a.decObject.property) - this.propertyNames.indexOf(b.decObject.property);
            }
            return 0;
        });
    }

    getSource(displayOption:DisplayOption| undefined){
        if(this.propertyDeclarations.length === 0) {return ''}

        let decsSrc = '';
        if (displayOption === DisplayOption.GroupName) {decsSrc += '/*' + this.title + '*/\n';}
        if (displayOption === DisplayOption.EmptyLine) {decsSrc += '\n';}

        decsSrc+=this.propertyDeclarations.reduce((p,c)=>{
            return p + c.src+'\n';
             
        },'');
        return decsSrc;
    }

    clear(){
        this.propertyDeclarations = [];
    }
}
