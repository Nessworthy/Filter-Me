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
			 * target_prefix (string): The attribute PREFIX used on all elements desired to be filtered. 
			 * 
			 * The filter's name should be APPENDED on to the end of this in your HTML.
			 * 
			 * e.g. 'data-filter'
			 * <div class="item" data-filter-myfilter="..."> ... </div>
			 */
			'target_prefix' : 'data-filter-',
			
			/**
			 * value_separator (string): The delimiter used to separate multiple values for one element's filter.
			 * 
			 * For filters where multiple values are needed (e.g. tags, categories, etc.), you may separate each value
			 * with the given separator.
			 * 
			 * e.g. ','
			 * <article data-filter-myfilter="sports,running,sprint"> ... </article>
			 */
			'value_separator' : ',',
			
			/**
			 * multi_filter (boolean): Determines whether multiple filters affect the matched results.
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
			'multi_filter' : true,
			
			/**
			 * check_on_start (boolean): Checks the value of all filters on instantiate if set to true.
			 * 
			 * This allows you to have predefined values in your filter inputs, which will become active as soon as .filterMe() is called.
			 * As of current, this runs the filter callback once per filter found, and then runs the results callback on completion.
			 * 
			 * e.g. true
			 */
			'check_on_start' : true,
			
			/**
			 * filter_type (string): The attribute used on the filter input to select the type of filter to use.
			 * 
			 * This is an optional attribute. If not used, the filter will use the filter type defined in 'default_filter_type'.
			 * See the 'filter types' section to see the list of available filter types on offer by default.
			 * 
			 * e.g. true
			 * <input type="text" value="running" data-filter-type="partial" data-filter-prefix="myfilter" />
			 */
			'filter_type' : 'data-filter-type',
			
			/**
			 * default_filter_type (string): The default filter type to use if no filter type is explicitly given for a filter.
			 * 
			 * See the 'filter types' section to see the list of available filter types on offer by default.
			 * 
			 * e.g. 'exact'
			 */
			'default_filter_type' : 'exact',
			
			/**
			 * partial_match_flags (string): The regex flags used to compare values with the 'partial' filter type.
			 * 
			 * There's plans in the future to restructure filter types. As such, this probably won't be staying here for long.
			 * 
			 * e.g. 'i' ('i' makes the input match both uppercase and lowercase values)
			 */
			'partial_match_flags' : 'i',
			
			/**
			 * results_callback (function): The callback function fired after all filters have been applied.
			 * 
			 * The function is supplied four arguments: All MATCHED elements, all UNMATCHED elements, all FOUND elements, and all active filters.
			 * This is the prawns to your salad. You need to define a function here or filterMe is pretty much useless.
			 * 
			 * Either a filtered element is matched or unmatched. For either, it will appear in all found elements.
			 * Please take into account that this function is irrespective of any other states that those elements are in e.g. animation.
			 * 
			 * e.g. function (filter_matched_elements, filter_unmatched_elements, filter_all_elements, active_filters) { ... }
			 */
			'results_callback' : function (filter_matched_elements, filter_unmatched_elements, filter_all_elements, active_filters) {},
			
			/**
			 * filter_callback' (function): The callback function fired after the filters have been updated.
			 * 
			 * The function is supplied three arguments: The triggered filter name, the active filters BEFORE the filter was applied, the final active filters object.
			 * If multi-filters is disabled, this will still return the last filter used.
			 * 
			 * e.g. function (new_filter_name, old_filters, new_filters) { ... }
			 */
			'filter_callback' : function (new_filter_name, old_filters, new_filters) {}
		}, args),
			/**
			 * Internal options do not really have any use outside of the plugin's inner workings (duh).
			 * 
			 * Some do, though. For example, you can change the reference alias of a filter type by changing it's value in filter_types.
			 * If you change the key though, be prepared for things to break.
			 */
			internal_options = {
				filter_types : {	// Key : setting.
					'exact' : 'exact',
					'partial' : 'partial'
				},
				active_filter_keys : { // Mainly for reference only. Just as long as these keys remain unique to one another.
					'filter_value' : 'value',
					'filter_type' : 'type'
				}
			};
		
		function get_filter_name_from_dom(element) {
			return $(element).attr(options.prefix);
		}
		
		function get_filter_type_from_dom(element) {
			
			var base_type = $(element).attr(options.filter_type),
				use_default_filter = false,
				calculated_filter_type;
				
			// Check if the filter type value is legit. If not, revert to default.
			if (!!base_type && !!base_type.length) {
				base_type = internal_options.filter_types[base_type];
				// Filter types.
				if (!base_type.length) {
					use_default_filter = true;
				}
			} else {
				use_default_filter = true;
			}
					
			if (use_default_filter === true) {
				calculated_filter_type = internal_options.filter_types[options.default_filter_type];
			} else {
				calculated_filter_type = base_type;
			}
			
			return calculated_filter_type;
			
		}
		
		function get_filter_value_from_dom(element) {
			
			var base_value = $(element).val();
			
			if (!base_value.length) {
				base_value = null;
			}
			
			return base_value;
		}
		
		function get_filter_type_from_obj(object) {
			return object[internal_options.active_filter_keys.filter_type];
		}
		
		function get_filter_value_from_obj(object) {
			return object[internal_options.active_filter_keys.filter_value];
		}
		
		function update_filter(current_filters, filter_element_to_apply) {

			var filter_name = get_filter_name_from_dom(filter_element_to_apply),
				filter_value = get_filter_value_from_dom(filter_element_to_apply),
				filter_type = get_filter_type_from_dom(filter_element_to_apply),
				new_filters;

			// First, does the filter exist?
			if (!!current_filters[filter_name]) {
				// If it does, has it changed?
				if (get_filter_value_from_obj(current_filters[filter_name]) === filter_value && get_filter_type_from_obj(current_filters[filter_name]) === filter_type) {
					// Well then, there's no real need to update the filter then, is there?
					return current_filters;
				}
			}

			// Okay. Are we checking for mutli-filters?
			// If we aren't we really don't need to care about the previous filter.
			if (options.multi_filter === true) {
				new_filters = current_filters;
			} else {
				new_filters = {};
			}
			
			// If we're still here, reset/register the filter.
			new_filters[filter_name] = {};

			// TODO: Needs toning down.
			new_filters[filter_name][internal_options.active_filter_keys.filter_value] = filter_value;
			new_filters[filter_name][internal_options.active_filter_keys.filter_type] = filter_type;

			// Trigger callback
			options.filter_callback(filter_element_to_apply, current_filters, new_filters);

			return new_filters;
		}
		
		function get_elements_to_filter(base, active_filters) {
			
			var elements,
				query = [];
			
			$.each(active_filters, function (filter_name, filter_object) {
				query.push('[' + options.target_prefix + filter_name + ']');
			});

			return $(base).find(query.join(', '));
		}
		
		// Core function
		function filter_elements(base, active_filters) {

			// Restructure the function to either operate on one filter at a time, or all passed filters. Latter would be easier.
			/* TODO: Need to change or provide option on how to handle
			   Elements (with multifilters on) which DO NOT use ALL active filter attributes. obv. empty values
			   e.g. data-filter-test = "" still count.
			   Something like strict_multimatch or something.
			 */
			
			var filter_all_elements = get_elements_to_filter(base, active_filters),
				filter_matched_elements = [],
				filter_unmatched_elements = [];
				
			// Okay. Let's determine which elements were matched.
				
			// Sort out the returned elements into matched or unmatched.
			filter_all_elements.each(function () {

				var element = this,
					perfect_match = true,
					// TODO: Has to be a better way of doing this!
					element_values = {},
					filters_matched = {};
					
				$.each(active_filters, function (active_filter_name, active_filter) {
					if (!!get_filter_value_from_obj(active_filter)) {
						filters_matched[active_filter_name] = false;
						// TODO: Potentially add option to allow or disallow multiple values?
						element_values[active_filter_name] = element.attributes[options.target_prefix + active_filter_name].value.split(options.value_separator);
					}
							
				});
				
				// Okay. Let's loop through the element's values and see if they match up.
				$.each(element_values, function (active_filter_name, element_filter_values) {

					var active_filter_value,
						active_filter_type;
						
					// No point in even trying if no values exist.
					if (!!element_filter_values.length) {
							
						active_filter_value = active_filters[active_filter_name][internal_options.active_filter_keys.filter_value];
						active_filter_type = active_filters[active_filter_name][internal_options.active_filter_keys.filter_type];
							
						$.each(element_filter_values, function (key, element_filter_value) {
	
							// Has it already been matched?
							if (filters_matched[active_filter_name]) {
	
								return;
									
							} else {
									
								// Does it match? Match sequence time! Yaay!
									
								if (active_filter_type === internal_options.filter_types.exact) {
										
									// Exact Match
										
									if (element_filter_value === active_filter_value) {
										filters_matched[active_filter_name] = true;
										return;
									}
									
								} else if (active_filter_type === internal_options.filter_types.partial) {
										
									// Partial Match
									// TODO: Add options support for regex flag?
									if (!!element_filter_value.match(new RegExp(active_filter_value, options.partial_match_flags))) {
										filters_matched[active_filter_name] = true;
										return;
									}
										
								}
							}
								
						});
								
					}
				});

				// Right. Do we have matching values?
				$.each(filters_matched, function (matched_filter_name, filter_matched_elements) {
					if (!filter_matched_elements) {
						perfect_match = false;
					}
				});
					
				if (perfect_match) {
					filter_matched_elements.push(element);
				} else {
					filter_unmatched_elements.push(element);
				}
					
			});
				
			// Time for our callback!
			options.results_callback(filter_matched_elements, filter_unmatched_elements, filter_all_elements, active_filters);
		}
		
		// We don't know what people are passing through here.
		this.each(function () {
			
			// Setup base variables.
			var base = $(this),
				active_filters = {};
				
			// This plugin uses the element it is called on as it's base.
			
			base.on('change', '[' + options.prefix + ']', function () {
				
				
				// Sort out the active filters
				active_filters = update_filter(active_filters, this);
				
				// Apply filters.
				filter_elements(base, active_filters);
				
			});
					
			if (options.check_on_start) {
				// Let's not be lazy and just trigger a change event. We don't know if other hooks are tied to the inputs too.
				base.find('[' + options.prefix + ']').each(function () {
					active_filters = update_filter(active_filters, this);
				});
				filter_elements(base, active_filters);
			}
			
		});
				
		// Final return for chaining.
		return this;
		
	};
	
}(jQuery));