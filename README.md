#Filter-Me

A simple jQuery plugin which provides a **framework** for filtering objects on your page.

##Usage

Apply filterMe to the BASE element of your area. This could be as specific or as broad as you want (you could even use document.body).
e.g. `$('#filter-area').filterMe(options);`

### Example

    $('#filter-area').filterMe({
    	'resultsCallback' : function(matched, unmatched, all, filters) {
    		$(unmatched).stop().fadeOut();
    		$(matched).stop().fadeIn();
    	}
    });


## Documentation

##Filter Types

Due to the early stages of this library, there are only two filter types available:

* `exact` - Exact match only. Faster, useful for drop-downs, radio buttons, etc.
* `partial` - Partial or exact matches only. This uses regex. Useful for searching.

##Update Notes

###0.4 Beaver `in development`
* Turned all documentation and code from using_underscores to camelCase to fit with jQuery.
* `INDEV` Turn filter type checking into callable functions with allowable overrides.
* `TODO` Dynamic processing - If off, do all processing at start (finding all elements). if on, do it on each trigger
* `TODO` Filter check option (on change, on keypress, etc.)
* `TODO` Accept a string as a callback argument, will fire out a jQuery event instead of just calling the function.

###0.3 Guinea Pig `stable`
* Filter code rewritten for performance and usability.
* Added filterCallback - Fired when the filter is updated.
* `options.callback` changed to `options.resultsCallback`, see above for the new arguments it is supplied.
* Added `options.partialMatchFlag`, allowing users to define the regex flags for partial matching.

###0.2 Hamster `stable`
* Filter types options - Can now specify whether the input to check for is a partial or exact match using filter type attribute.

###0.1 Mouse `stable`
* Multi-filter option - Whether 'matched' should be limited to all elements matching multiple filters.
* Adds optional check to process values on initiate.
* Added support for multiple elements to be passed to it.