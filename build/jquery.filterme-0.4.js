/**
 * FilterMe - A framework for filtering stuff using jQuery.
 * 
 * Documentation and examples found at:
 * https://github.com/Nessworthy/Filter-Me
 * 
 * @author Sean Nessworthy
 * @version 0.4 (Beaver) (IN DEVELOPMENT, UNSTABLE)
 * @requires jQuery
 * 
 * @param args The arguments used to configure / tailor your filter. See the documentation for more info.
 */
(function ($) {
    "use strict";
    
	$.fn.filterMe = function (args) {

		// Setup base options.
		var options = $.extend({
			/**
			 * prefix (string): The attribute used to mark an element as a filter selector.
			 * 
			 * As of current, this should ONLY be used on an input element, or an element which uses .val().
			 * Future plans involve extending the functionality of this to include other options, such as the inner value.
			 * 
			 * e.g. 'data-filter-prefix'
			 * <input type="text" data-filter-prefix="myfilter" />
			 */
			'prefix' : 'data-filter-prefix',
			
			/**
			 * targetPrefix (string): The attribute PREFIX used on all elements desired to be filtered. 
			 * 
			 * The filter's name should be APPENDED on to the end of this in your HTML.
			 * 
			 * e.g. 'data-filter'
			 * <div class="item" data-filter-myfilter="..."> ... </div>
			 */
			'targetPrefix' : 'data-filter-',
			
			/**
			 * valueSeparator (string): The delimiter used to separate multiple values for one element's filter.
			 * 
			 * For filters where multiple values are needed (e.g. tags, categories, etc.), you may separate each value
			 * with the given separator.
			 * 
			 * e.g. ','
			 * <article data-filter-myfilter="sports,running,sprint"> ... </article>
			 */
			'valueSeparator' : ',',
			
			/**
			 * multiFilter (boolean): Determines whether multiple filters affect the matched results.
			 * 
			 * For filterMe instances which use multiple filters (e.g. by date AND/OR by category). If set to true,
			 * elements will only be considered as 'matched' if they meet all requirements of every active filter.
			 * 
			 * This is in development still, and a future version will enable a non-strict matching option for multi filters.
			 * That would mean elements to be filtered without one or more currently active filter attributes declared are still
			 * flagged as 'matched' so long as the active filter attributes they do have declared meet their criteria.
			 * e.g. With the active filters: 'foo' = 'bar' and 'foobar' = 'helloworld', something like:
			 * <div data-filter-foo="bar"> ... </div>
			 * would STILL match.
			 * 
			 * If set to false, only the most active filter will be used.
			 * 
			 * e.g. true
			 */
			'multiFilter' : true,
			
			/**
			 * checkOnStart (boolean): Checks the value of all filters on instantiate if set to true.
			 * 
			 * This allows you to have predefined values in your filter inputs, which will become active as soon as .filterMe() is called.
			 * As of current, this runs the filter callback once per filter found, and then runs the results callback on completion.
			 * 
			 * e.g. true
			 */
			'checkOnStart' : true,
			
			/**
			 * filterType (string): The attribute used on the filter input to select the type of filter to use.
			 * 
			 * This is an optional attribute. If not used, the filter will use the filter type defined in 'defaultFilterType'.
			 * See the 'filter types' section to see the list of available filter types on offer by default.
			 * 
			 * e.g. true
			 * <input type="text" value="running" data-filter-type="partial" data-filter-prefix="myfilter" />
			 */
			'filterType' : 'data-filter-type',
			
			/**
			 * defaultFilterType (string): The default filter type to use if no filter type is explicitly given for a filter.
			 * 
			 * See the 'filter types' section to see the list of available filter types on offer by default.
			 * 
			 * e.g. 'exact'
			 */
			'defaultFilterType' : 'exact',
			
			/**
			 * partialMatchFlags (string): The regex flags used to compare values with the 'partial' filter type.
			 * 
			 * There's plans in the future to restructure filter types. As such, this probably won't be staying here for long.
			 * 
			 * e.g. 'i' ('i' makes the input match both uppercase and lowercase values)
			 */
			'partialMatchFlags' : 'i',
			
			/**
			 * resultsCallback (function): The callback function fired after all filters have been applied.
			 * 
			 * The function is supplied four arguments: All MATCHED elements, all UNMATCHED elements, all FOUND elements, and all active filters.
			 * This is the prawns to your salad. You need to define a function here or filterMe is pretty much useless.
			 * 
			 * Either a filtered element is matched or unmatched. For either, it will appear in all found elements.
			 * Please take into account that this function is irrespective of any other states that those elements are in e.g. animation.
			 * 
			 * e.g. function (filterMatchedElements, filterUnmatchedElements, filterAllElements, activeFilters) { ... }
			 */
			'resultsCallback' : function (filterMatchedElements, filterUnmatchedElements, filterAllElements, activeFilters) {},
			
			/**
			 * filterCallback' (function): The callback function fired after the filters have been updated.
			 * 
			 * The function is supplied three arguments: The triggered filter name, the active filters BEFORE the filter was applied, the final active filters object.
			 * If multi-filters is disabled, this will still return the last filter used.
			 * 
			 * e.g. function (newFilterName, oldFilters, newFilters) { ... }
			 */
			'filterCallback' : function (newFilterName, oldFilters, newFilters) {}
		}, args),
			/**
			 * Internal options do not really have any use outside of the plugin's inner workings (duh).
			 * 
			 * Some do, though. For example, you can change the reference alias of a filter type by changing it's value in filterTypes.
			 * If you change the key though, be prepared for things to break.
			 */
			// TODO: Move internal options into parent scope. change filters to reflect new system.
			internalOptions = {
				filterTypes : {	// Key : setting.
					'exact' : 'exact',
					'partial' : 'partial'
				},
				activeFilterKeys : { // Mainly for reference only. Just as long as these keys remain unique to one another.
					'filterValue' : 'value',
					'filterType' : 'type'
				}
			};
		
		/**
		 * Takes an element and uses the prefix option to retrieve it's filter name.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} element An object node or a jquery object of a node.
		 * @return {string} The filter name from the object.
		 */
		function getFilterNameFromDom(element) {
			return $(element).attr(options.prefix);
		}

		/**
		 * Retrieves the filter type from a given element.
		 * Uses options to revert to a default value if none exists.
		 * 
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} element An object node or a jquery object of a node.
		 * @return {string} The calculated filter type.
		 */
		function getFilterTypeFromDom(element) {
			
			var baseType = $(element).attr(options.filterType),
				useDefaultFilter = false,
				calculatedFilterType;
				
			// Check if the filter type value is legit. If not, revert to default.
			if (!!baseType && !!baseType.length) {
				baseType = internalOptions.filterTypes[baseType];
				// Filter types.
				if (!baseType.length) {
					useDefaultFilter = true;
				}
			} else {
				useDefaultFilter = true;
			}
					
			if (useDefaultFilter === true) {
				calculatedFilterType = internalOptions.filterTypes[options.defaultFilterType];
			} else {
				calculatedFilterType = baseType;
			}
			
			return calculatedFilterType;
			
		}
		
		/**
		 * Retrieves the filter's value from a given element.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} element An object node or a jquery object of a node.
		 * @return {string} The current value of the filter.
		 */
		function getFilterValueFromDom(element) {
			
			var baseValue = $(element).val();
			
			if (!baseValue.length) {
				baseValue = null;
			}
			
			return baseValue;
		}
		
		/**
		 * Retrieves the filter's type from the internal filter object.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} object the internal filter object.
		 * @return {string} The object's filter type.
		 */
		function getFilterTypeFromObj(object) {
			return object[internalOptions.activeFilterKeys.filterType];
		}

		/**
		 * Retrieves the filter's value from the internal filter object.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} object the internal filter object.
		 * @return {string} The object's filter value.
		 */
		function getFilterValueFromObj(object) {
			return object[internalOptions.activeFilterKeys.filterValue];
		}

		/**
		 * Updates the given filter object by applying the new filter to it.
		 * In the case where multi-options is disabled, this will replace the previous filter.
		 * Fires the filterCallback function.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} currentFilters The internal object containing the currently active filters.
		 * @param {object} filterElementToApply The HTML node or jQuery object which defines the filter in the DOM.
		 * @return {string} The object's filter type.
		 */
		function updateFilter(currentFilters, filterElementToApply) {

			var filterName = getFilterNameFromDom(filterElementToApply),
				filterValue = getFilterValueFromDom(filterElementToApply),
				filterType = getFilterTypeFromDom(filterElementToApply),
				newFilters;

			// First, does the filter exist?
			if (!!currentFilters[filterName]) {
				// If it does, has it changed?
				if (getFilterValueFromObj(currentFilters[filterName]) === filterValue && getFilterTypeFromObj(currentFilters[filterName]) === filterType) {
					// Well then, there's no real need to update the filter then, is there?
					return currentFilters;
				}
			}

			// Okay. Are we checking for mutli-filters?
			// If we aren't we really don't need to care about the previous filter.
			if (options.multiFilter === true) {
				newFilters = currentFilters;
			} else {
				newFilters = {};
			}
			
			// If we're still here, reset/register the filter.
			newFilters[filterName] = {};

			// TODO: Needs toning down.
			newFilters[filterName][internalOptions.activeFilterKeys.filterValue] = filterValue;
			newFilters[filterName][internalOptions.activeFilterKeys.filterType] = filterType;

			// Trigger callback
			options.filterCallback(filterElementToApply, currentFilters, newFilters);

			return newFilters;
		}
		
		/**
		 * Returns all filterable elements based on the currently active filters.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} base The base HTML node or jQuery object that the plugin was instantiated on.
		 * @param {object} activeFilters The internal activeFilters object.
		 * @return {object} A jQuery object containing the list of node elements available for filtering.
		 */
		function getElementsToFilter(base, activeFilters) {
			
			var elements,
				query = [];
			
			$.each(activeFilters, function (filterName, filterObject) {
				query.push('[' + options.targetPrefix + filterName + ']');
			});

			return $(base).find(query.join(', '));
		}
		
		/**
		 * The core function which calculates which elements match the active filters, and which do not.
		 * 
		 * @since 0.3 (Guinea Pig)
		 * 
		 * @param {object} base The base HTML node or jQuery object that the plugin was instantiated on.
		 * @param {object} activeFilters The internal activeFilters object.
		 */
		function filterElements(base, activeFilters) {

			// Restructure the function to either operate on one filter at a time, or all passed filters. Latter would be easier.
			/* TODO: Need to change or provide option on how to handle
			   Elements (with multifilters on) which DO NOT use ALL active filter attributes. obv. empty values
			   e.g. data-filter-test = "" still count.
			   Something like strictMultimatch or something.
			 */
			
			var filterAllElements = getElementsToFilter(base, activeFilters),
				filterMatchedElements = [],
				filterUnmatchedElements = [];
				
			// Okay. Let's determine which elements were matched.
				
			// Sort out the returned elements into matched or unmatched.
			filterAllElements.each(function () {

				var element = this,
					perfectMatch = true,
					// TODO: Has to be a better way of doing this!
					elementValues = {},
					filtersMatched = {};
					
				$.each(activeFilters, function (activeFilterName, activeFilter) {
					if (!!getFilterValueFromObj(activeFilter)) {
						filtersMatched[activeFilterName] = false;
						// TODO: Potentially add option to allow or disallow multiple values?
						elementValues[activeFilterName] = element.attributes[options.targetPrefix + activeFilterName].value.split(options.valueSeparator);
					}
							
				});
				
				// Okay. Let's loop through the element's values and see if they match up.
				$.each(elementValues, function (activeFilterName, elementFilterValues) {

					var activeFilterValue,
						activeFilterType;
						
					// No point in even trying if no values exist.
					if (!!elementFilterValues.length) {
							
						activeFilterValue = activeFilters[activeFilterName][internalOptions.activeFilterKeys.filterValue];
						activeFilterType = activeFilters[activeFilteName][internalOptions.activeFilterKeys.filterType];
							
						$.each(elementFilterValues, function (key, elementFilterValue) {
	
							// Has it already been matched?
							if (filtersMatched[activeFilterName]) {
	
								return;
									
							} else {
									
								// Does it match? Match sequence time! Yaay!
									
								if (activeFilterType === internalOptions.filterTypes.exact) {
										
									// Exact Match
										
									if (elementFilterValue === activeFilterValue) {
										filtersMatched[activeFilterName] = true;
										return;
									}
									
								} else if (activeFilterType === internalOptions.filterTypes.partial) {
										
									// Partial Match
									if (!!elementFilterValue.match(new RegExp(activeFilterValue, options.partialMatchFlags))) {
										filtersMatched[activeFilterName] = true;
										return;
									}
										
								}
							}
								
						});
								
					}
				});

				// Right. Do we have matching values?
				$.each(filtersMatched, function (matchedFilterName, filterMatchedElements) {
					if (!filterMatchedElements) {
						perfectMatch = false;
					}
				});
					
				if (perfectMatch) {
					filterMatchedElements.push(element);
				} else {
					filterUnmatchedElements.push(element);
				}
					
			});
				
			// Time for our callback!
			options.resultsCallback(filterMatchedElements, filterUnmatchedElements, filterAllElements, activeFilters);
		}
		
		// We don't know what people are passing through here.
		this.each(function () {
			
			// Setup base variables.
			var base = $(this),
				activeFilters = {};
				
			// This plugin uses the element it is called on as it's base.
			
			base.on('change', '[' + options.prefix + ']', function () {
				
				
				// Sort out the active filters
				activeFilters = updateFilter(activeFilters, this);
				
				// Apply filters.
				filterElements(base, activeFilters);
				
			});
					
			if (options.checkOnStart) {
				// Let's not be lazy and just trigger a change event. We don't know if other hooks are tied to the inputs too.
				base.find('[' + options.prefix + ']').each(function () {
					activeFilters = updateFilter(activeFilters, this);
				});
				filterElements(base, activeFilters);
			}
			
		});
				
		// Final return for chaining.
		return this;
		
	};
	
	// filterMe Extension Kit.
	$.extend({
		/**
		 * Provides an easy-to-use API to extend on (+|/) interact with filterMe.
		 * 
		 * @since 0.4 (Beaver)
		 * 
		 * @param {string} action The action you want to perform. Check the documentation for a list of actions.
		 * @param {mixed} options Any additional options the action requires. Check the documentation for more info.
		 * @return {mixed} The return value based on the action performed. Check the documentation for a list.
		 */
    	filterMe : function (action, options) {
    		
    		actions = {
    			/**
    			 * addFilter - Adds a filter to the filterMe library.
    			 * 
    			 * If addFilter is called AFTER a filterMe object has been instantiated, it will NOT detect the new filter.
    			 * However, all subsequent calls after the addFilter action will.
    			 * 
    			 * @since 0.4 (Beaver)
    			 * 
    			 * @param {object} options The object which handles the filter. Check the documentation for more info.
    			 */
    			addFilter : function(options) {
    				
    			}
    		}
    		
    		
    		// Basic execution. Look in the list of actions.
    		if(typeof this.actions[action] === 'function') {
    			this.actions[action](options);
    		}
    		
    	}	
    });
	
	// Now that we're done. Let's add the core filters.
	$.filterMe('addFilter', {
		'name' : 'exact',
		'filter' : function(filterValue, elementValue, element) {
			if(filterValue === elementValue) {
				return true;
			} else {
				return false;
			}
		}
	});
	
	$.filterMe('addFilter', {
		'name' : 'partial',
		'filter' : function(filterValue, elementValue, element) {
			if (elementValue.match(new RegExp(filterValue, 'i'))) {
				return true;
			} else {
				return false;
			}
		}
	})
	
}(jQuery));