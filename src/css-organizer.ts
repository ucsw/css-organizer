import * as vscode from 'vscode';
const css = require('css');

export class CssOrganizer{
    context : vscode.ExtensionContext;

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
    
        // Get the abstract syntax tree (AST) for the CSS
        const editor = vscode.window.activeTextEditor;
        if (!editor) {return;}
        const ast = AST.fromText(editor.document);
        // console.log(ast?.getRules());
        
        if (ast){
        // Get rules
            const rules = ast.pickRulesFrom(editor.selection)
            console.log(rules);
            // For each rule
            // Sort properties
            rules.forEach( (r:any):Rule => r.sortAlpha());
            console.log("*** Sorted ***");
            console.log(rules);


            editor.edit( (edit: vscode.TextEditorEdit) =>{
                rules.reverse().forEach((r:Rule):void => {
                    edit.replace(...r.getReplaceData());
                });
                
            } );        
        }


        // Replace
        this.info('OrganizeAlphabetically from css-organizer!');
    }

    organizeSystematically() {
        this.info('OrganizeSystematically from css-organizer!');
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
    static  RULE_CONTAINING_TYPES = ['document','host','media','supports']

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
    newDecSource: string = ''
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

    getReplaceData() : [vscode.Range,string]{
        const minLineNr = this.decs.reduce((p,c)=>{
            return p.start.line < c.start.line ? p : c;
        }).start.line;

        const maxLine = this.decs.reduce((p,c)=>{
            return p.end.line > c.end.line ? p : c;
        }).end;
        const maxLineNr = maxLine.line;
        const maxLineCharNr = maxLine.character+1;

        console.log(`minLine:${minLineNr} maxLine:${maxLineNr} maxLineCharNr:${maxLineCharNr}`);


        const decsSrc = this.decs.reduce((p,c)=>{
            return p + c.src+'\n';
             
        },'').slice(0, -1);
        
        // console.log(decsSrc);
        const editData : [vscode.Range,string]= [new vscode.Range(new vscode.Position(minLineNr,0), new vscode.Position(maxLineNr,maxLineCharNr)), decsSrc];

        return editData;

    }
}

class Declaration{
    decObject:any;
    start : vscode.Position;
    end : vscode.Position;
    range : vscode.Range;
    src: string = '';

    constructor(decbject:any){
        this.decObject = decbject;
        this.start = new vscode.Position(this.decObject.position.start.line -1,this.decObject.position.start.column-1);
        this.end = new vscode.Position(this.decObject.position.end.line -1,this.decObject.position.end.column-1);
        this.range =  new vscode.Range(this.start,this.end);
    }

    setSourceFrom(doc:vscode.TextDocument){
        this.src=''
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
    groups:Group[] = [];
}

class Group{
    propertyNames:string[] = [];
    propertyDeclarations: Declaration[] = [];
}
