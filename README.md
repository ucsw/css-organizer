# Css-Organizer - Organize Your CSS Properties

Css-organizer lets you organize your CSS properties file so that the properties under each rule can be sorted either 
-   alphabetically or 
-   systematically into groups.

You can select a single rule to sort or a selection of rules or all the rules. You setup your own way of grouping if you want.

The sorting does not affect the order of the CSS rules in the files.


<br><br>

![](https://raw.githubusercontent.com/ucsw/css-organizer/main/images/css-organizer.gif)


## Use Cases

-   <b>UC 1 I want to sort the properties of this rule alphabetically</b>:<br>
Place the cursor somewhere within the the rule and select `Context menu->Organize CSS->CSS Properties Alphabetically`<br> _or_ `ctrl+alt+c` and then `a` <br>_or_ use the command palette `ctrl+shift+p` and then choose `CSS Properties Alphabetically`

-   **UC 2 I want to sort the properties of this rule into groups:**<br>
Place the cursor somewhere within the the rule and `Context menu->Organize CSS->CSS Properties Grouped`<br> _or_ `ctrl+alt+c` and then `g` <br>_or_ use the command palette `ctrl+shift+p` and then choose `CSS Properties Grouped`

-   **UC 3 I want to sort the properties of a _some rules_:**<br>
Select the rules and then proceed as in UC1 or UC2. Every rule 'touched' by the selection will be included.

-   **UC 4 I want to sort the properties of _all rules_.</i> :**<br>
Select everything, `ctrl-a`, then do as in UC1 or UC2.

-   **UC 5 When sorting in groups i want the group names to show, spaces between groups, nothing between groups :**<br>
Go to the settings and set the display options

-   **UC 6 I want to set up grouping in my own way :**<br>
Edit the `user-grouping.json` file in the extension path/resources (or create your own file in the same directory) Go to settings select  `css-organizer.alternativeGroupingFileUse`, if you have created a new file, put its name in `css-organizer.alternativeGroupingFile`
-   **UC 7 I regret what I just did :**<br>
Just use `ctrl-z` and/or `ctrl-y` as you normally would.
## css-organizer Settings

*   `css-organizer.displayOption` Select if group names to show, spaces between groups, nothing between groups.
*   `css-organizer.alternativeGroupingFile` Set the name of the file containing user defined CSS property grouping.
*   `css-organizer.alternativeGroupingFileUse` Select if the user defined CSS property grouping shall be used.

## Known Issues

* Erroneous CSS or badly formatted CSS (several properties on the same line, badly placed braces etc.) can give unpredictable results. Tip: Beautify first.

* Discontinuously selected rules does not work (yet).

## Release Notes

### 1.0.0 First version.

## Acknowledgements
The default sorting order for grouped CSS properties is very much inspired by the sorting order presented in the excellent [Kevin Powell video](https://www.youtube.com/watch?v=3Y03OSNw6zo&t=496s) discussing the benefits of organizing CSS properties.
## Support the team
If you find that using this tool saves you time and money, and you can afford it, consider supporting us. [Donate via Paypal](https://www.paypal.com/donate/?hosted_button_id=6P3N2A2THNDKJ)
## Web Site
Visit the UC Software website [ucsoftware.net](https://ucsoftware.net).


