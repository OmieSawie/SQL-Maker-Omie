async function getMissionsListFilteredV110(req, res) {
  try {
    let summaryParameters;
    let aggregationParameters;

    let tripFromTime = req.query.start_after;
    let tripTillTime = req.query.start_before;
    const clientId = parseInt(req.params.clientId);
    if (req.query.start_after) {
      const startFrom = new Date(req.query.start_after);
      if (
        !isNaN(startFrom.valueOf()) &&
        startFrom.toISOString() === req.query.start_after
      ) {
        tripFromTime = super.getValidTimestampFromISOString(
          req.query.start_after
        );
      }
    }
    if (req.query.start_before) {
      const startTill = new Date(req.query.start_before);
      if (
        !isNaN(startTill.valueOf()) &&
        startTill.toISOString() === req.query.start_before
      ) {
        tripTillTime = super.getValidTimestampFromISOString(
          req.query.start_before
        );
      }
    }
    tripFromTime = parseInt(tripFromTime);
    tripTillTime = parseInt(tripTillTime);

    let customerType = "";
    if (clientId === 1) {
      customerType = "datomsX";
    } else {
      const clientOrVendor =
        "SELECT clep_id FROM service_subscription_tbl WHERE clep_id = ? AND serv_id = 17;";
      const clientOrVendorResult = await super.queryDb(clientOrVendor, [
        clientId,
      ]);
      if (clientOrVendorResult.length) {
        customerType = "vendor";
      } else {
        customerType = "customer";
      }
    }

    const mergedRequestCustomerIds = [clientId];
    // apply only for the end customer & Datoms users
    if (clientId === req.user.oi || req.user.oi === 1) {
      if (clientId === 1218) {
        mergedRequestCustomerIds.push(1603);
      } else if (clientId === 1157) {
        mergedRequestCustomerIds.push(1876);
      } else if (clientId === 1436) {
        mergedRequestCustomerIds.push(2267);
      } else if (clientId === 310) {
        mergedRequestCustomerIds.push(639);
        // access to jeet banerjee for lanjiberna mines
        if ([41, 2247, 4759, 3886].includes(req.user.ui)) {
          mergedRequestCustomerIds.push(2533);
        }
      } else if (clientId === 3725) {
        mergedRequestCustomerIds.push(2169);
        mergedRequestCustomerIds.push(1094);
        mergedRequestCustomerIds.push(2231);
        mergedRequestCustomerIds.push(11118);
      } else if (clientId === 3484) {
        mergedRequestCustomerIds.push(1970);
      } else if (clientId === 1355) {
        if ([5788].includes(req.user.ui)) {
          mergedRequestCustomerIds.push(1201);
          mergedRequestCustomerIds.push(1139);
        }
      } else if (clientId === 1806) {
        mergedRequestCustomerIds.push(10795);
      } else if (clientId === 267) {
        mergedRequestCustomerIds.push(11386);
      }
    }

    let tagsOfCustomer = [];
    if (req.query.tag_options === "true") {
      let tagType = "";
      if (req.query.category_id === "18") {
        tagType = 5;
      } else if (
        req.query.category_id === "67" ||
        req.query.category_id === "76"
      ) {
        tagType = 6;
      }
      const tagsForCategory = await super.queryDb(
        "SELECT dtmtgs_id AS tag_id, dtmtgs_name AS tag_name, dtmtgs_color AS tag_color FROM datoms_tags WHERE dtmtgs_entity_type = ? AND clep_id IN (?);",
        [tagType, [0, ...mergedRequestCustomerIds]]
      );
      tagsOfCustomer = tagsForCategory;

      // 3 tags "in transit", "internal transfer" and "test drive" only for Anant Motors and Kalyani Motors.
      if (![2149, 2325].includes(clientId)) {
        tagsOfCustomer = tagsForCategory.filter((tag) => {
          return ![16, 17, 18].includes(tag.tag_id);
        });
      }
    }
    const userDetails = {
      user_id: req.user.ui,
      entity_type: "industry",
      entity_organization_id: clientId,
      action: [actions.ThingManagementDataView],
    };
    const customerAccessToUser = await ACL.getActionAccessableEntities(
      userDetails
    );

    let tasksQuery =
      "SELECT task_thing_links.tsk_id, tasks.tsk_name, tasks.tsk_tags, tasks.tsk_status, tasks.tsk_actual_start_time, tasks.tsk_actual_end_time, tasks.tsk_created_at, task_thing_links.thing_id, tasks.tsk_asginee_user, tasks.tsk_data";
    // if (["67"].includes(req.query.category_id)) {
    // 	tasksQuery +=
    // 		",thing_rental_orders.tro_purpose, thing_rental_orders.tro_assigned_to";
    // }
    let countsQuery = "SELECT COUNT(*) AS totalMissions";
    let summaryQuery = "SELECT COUNT(*) AS totalMissions";
    let thingsFilterQuery =
      " FROM phoenzbi_data.task_thing_links INNER JOIN phoenzbi_data.tasks ON task_thing_links.tsk_id = tasks.tsk_id";
    // if (["67"].includes(req.query.category_id)) {
    // 	thingsFilterQuery +=
    // 		" LEFT JOIN task_rental_order_link ON tasks.tsk_id = task_rental_order_link.tsk_id LEFT JOIN thing_rental_orders ON task_rental_order_link.tro_id = thing_rental_orders.tro_id";
    // }
    thingsFilterQuery +=
      " WHERE task_thing_links.thing_id IN ( SELECT thing_id FROM things WHERE thing_isactive = 1";
    const thingFilterParams = [];
    let endQuery =
      " AND (tasks.tsk_actual_start_time >= ? AND tasks.tsk_actual_start_time <= ? ) AND tasks.tsk_is_active = 1";
    if (req.query.partial_trip === "true") {
      endQuery =
        " AND (tasks.tsk_actual_end_time > ? AND tasks.tsk_actual_start_time < ? ) AND tasks.tsk_is_active = 1";
    }
    // show internal missions to datomsX
    if (customerType !== "datomsX") {
      endQuery += " AND tasks.tsk_is_internal != 1";
    }

    if (customerType === "datomsX") {
      thingsFilterQuery += "";
    } else if (customerType === "vendor") {
      thingsFilterQuery +=
        " AND (thing_vendor_id IN (?) OR thing_owner_id IN (?))";
      thingFilterParams.push(
        mergedRequestCustomerIds,
        mergedRequestCustomerIds
      );
    } else if (customerType === "customer") {
      const currentTime = moment().unix();
      const rentCheckResults = await super.queryDb(
        "SELECT thing_rental_order_thing_links.thing_id FROM phoenzbi_data.thing_rental_order_thing_links INNER JOIN phoenzbi_data.thing_rental_orders ON thing_rental_order_thing_links.tro_id = thing_rental_orders.tro_id WHERE thing_rental_orders.clep_id IN (?) AND thing_rental_orders.tro_status=1 AND thing_rental_orders.tro_start_time <= ? AND (thing_rental_orders.tro_end_time >= ? OR thing_rental_orders.tro_end_time = 0); SELECT thing_id FROM phoenzbi_data.thing_rental_assign WHERE clep_id IN (?) AND tra_end_time=0;",
        [
          mergedRequestCustomerIds,
          currentTime,
          currentTime,
          mergedRequestCustomerIds,
        ]
      );
      const orderResults = rentCheckResults[0];
      const thingAssignResults = rentCheckResults[1];
      const rentalThingIds = [];
      if (orderResults.length || thingAssignResults.length) {
        for (const thing of orderResults) {
          rentalThingIds.push(thing.thing_id);
        }
        for (const thing of thingAssignResults) {
          rentalThingIds.push(thing.thing_id);
        }
      }
      if (rentalThingIds.length) {
        thingsFilterQuery += " AND (clep_id IN (?) OR thing_id IN (?))";
        thingFilterParams.push(mergedRequestCustomerIds, rentalThingIds);
      } else {
        thingsFilterQuery += " AND clep_id IN (?)";
        thingFilterParams.push(mergedRequestCustomerIds);
      }
    }

    try {
      summaryParameters = JSON.parse(req.query.summary_parameters);
    } catch (error) {
      summaryParameters = [];
    }
    try {
      aggregationParameters = JSON.parse(req.query.parameters);
      if (!aggregationParameters.includes("fuel_filled")) {
        aggregationParameters.push("fuel_filled");
      }
      if (!aggregationParameters.includes("fuel_theft")) {
        aggregationParameters.push("fuel_theft");
      }
    } catch (error) {
      aggregationParameters = [];
    }
    // console.log("AGGREGATION PARAMS ==> ", aggregationParameters);

    if (req.query.category_id) {
      thingsFilterQuery += " AND tct_id = ?";
      thingFilterParams.push(req.query.category_id);
    }

    let requestedClepIds = [];

    if (req.query.vendor_id) {
      requestedClepIds = req.query.vendor_id.includes(",")
        ? req.query.vendor_id.split(",").map((id) => parseInt(id))
        : [parseInt(req.query.vendor_id)];
    } else if (req.query.client_id) {
      requestedClepIds = req.query.client_id.includes(",")
        ? req.query.client_id.split(",").map((id) => parseInt(id))
        : [parseInt(req.query.client_id)];
    }

    const mergedCustomerIds = [];
    if (requestedClepIds.includes(1218)) {
      mergedCustomerIds.push(1603);
    }
    if (requestedClepIds.includes(1157)) {
      mergedCustomerIds.push(1876);
    }
    if (requestedClepIds.includes(1436)) {
      mergedCustomerIds.push(2267);
    }
    if (requestedClepIds.includes(310)) {
      mergedCustomerIds.push(639);
      // access to jeet banerjee for lanjiberna mines
      if ([41, 2247, 4759, 3886].includes(userDetails.user_id)) {
        mergedCustomerIds.push(2533);
      }
    }
    if (requestedClepIds.includes(3725)) {
      mergedCustomerIds.push(2169);
      mergedCustomerIds.push(1094);
      mergedCustomerIds.push(2231);
      mergedCustomerIds.push(11118);
    }
    if (requestedClepIds.includes(3484)) {
      mergedCustomerIds.push(1970);
    }
    if (requestedClepIds.includes(1355)) {
      mergedCustomerIds.push(1201);
      mergedCustomerIds.push(1139);
    }
    if (requestedClepIds.includes(1806)) {
      mergedCustomerIds.push(10795);
    }
    if (requestedClepIds.includes(267)) {
      mergedCustomerIds.push(11386);
    }

    requestedClepIds = [...requestedClepIds, ...mergedCustomerIds];

    if (req.query.vendor_id) {
      thingsFilterQuery +=
        " AND (thing_vendor_id IN (?) OR thing_owner_id IN (?))";
      thingFilterParams.push(requestedClepIds, requestedClepIds);
    }

    if (req.query.client_id) {
      const currentTime = moment().unix();
      const rentCheckResults = await super.queryDb(
        "SELECT thing_rental_order_thing_links.thing_id FROM phoenzbi_data.thing_rental_order_thing_links INNER JOIN phoenzbi_data.thing_rental_orders ON thing_rental_order_thing_links.tro_id = thing_rental_orders.tro_id WHERE thing_rental_orders.clep_id IN (?) AND thing_rental_orders.tro_status=1 AND thing_rental_orders.tro_start_time <= ? AND (thing_rental_orders.tro_end_time >= ? OR thing_rental_orders.tro_end_time = 0); SELECT thing_id FROM phoenzbi_data.thing_rental_assign WHERE clep_id IN (?) AND tra_end_time=0;",
        [requestedClepIds, currentTime, currentTime, requestedClepIds]
      );
      const orderResults = rentCheckResults[0];
      const thingAssignResults = rentCheckResults[1];
      const rentalThingIds = [];
      if (orderResults.length || thingAssignResults.length) {
        for (const thing of orderResults) {
          rentalThingIds.push(thing.thing_id);
        }
        for (const thing of thingAssignResults) {
          rentalThingIds.push(thing.thing_id);
        }
      }
      if (rentalThingIds.length) {
        thingsFilterQuery += " AND (clep_id IN (?) OR thing_id IN (?))";
        thingFilterParams.push(requestedClepIds, rentalThingIds);
      } else {
        thingsFilterQuery += " AND clep_id IN (?)";
        thingFilterParams.push(requestedClepIds);
      }
    }

    if (customerAccessToUser !== "*") {
      thingsFilterQuery += " AND clep_id IN (?)";
      thingFilterParams.push([clientId, ...customerAccessToUser]);
    }

    if (req.query.thing_list) {
      thingsFilterQuery += " AND thing_id IN (?)";
      thingFilterParams.push(req.query.thing_list.split(","));
    }

    if (
      ["18", "67", "76", "78", "91"].includes(req.query.category_id) &&
      (summaryParameters.includes("total_runhour") ||
        summaryParameters.includes("fuel_cons_per_hr") ||
        summaryParameters.includes("avarage_speed"))
    ) {
      summaryQuery += ", SUM(g_td_calculated_runhour_sum) as total_runhour";
    }
    if (
      ["18", "67"].includes(req.query.category_id) &&
      (summaryParameters.includes("total_fuel_consumed") ||
        summaryParameters.includes("fuel_cons_per_hr") ||
        summaryParameters.includes("energy_gen_per_litre") ||
        summaryParameters.includes("fuel_cons_per_kwh"))
    ) {
      summaryQuery += ", SUM(g_td_fuel_consumption_sum) as total_fuel_consumed";
    }
    if (
      ["18", "91"].includes(req.query.category_id) &&
      (summaryParameters.includes("total_energy") ||
        summaryParameters.includes("energy_gen_per_litre") ||
        summaryParameters.includes("fuel_cons_per_kwh"))
    ) {
      summaryQuery += ", SUM(g_td_calculated_energy_sum) as total_energy";
    }
    if (summaryParameters.includes("total_mains_energy")) {
      summaryQuery +=
        ", SUM(g_td_calculated_mains_energy_sum) as total_mains_energy";
    }
    if (
      ["67", "76"].includes(req.query.category_id) &&
      (summaryParameters.includes("total_distance") ||
        summaryParameters.includes("avarage_speed") ||
        summaryParameters.includes("avg_trip_distance"))
    ) {
      summaryQuery += ", SUM(g_td_distance_travelled_sum) as total_distance";
    }
    if (
      ["67", "76"].includes(req.query.category_id) &&
      summaryParameters.includes("top_speed")
    ) {
      summaryQuery += ", MAX(g_td_speed_max) as top_speed";
    }

    // filters based on things

    if (
      req.query.thing_make ||
      req.query.thing_kva ||
      req.query.thing_model ||
      req.query.thing_tankCapacity ||
      req.query.thing_power_factor ||
      req.query.dg_phase ||
      req.query.lifetime_runhour
    ) {
      if (req.query.thing_make) {
        const { query, params } = this.assetFilterBasedOnText(
          req,
          "thing_make"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.thing_kva) {
        const { query, params } = assetFilterBasedOnNumber(
          req,
          "thing_kva"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.thing_model) {
        const { query, params } = this.assetFilterBasedOnText(
          req,
          "thing_model"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.thing_tankCapacity) {
        const { query, params } = assetFilterBasedOnNumber(
          req,
          "thing_tankCapacity"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.thing_power_factor) {
        const { query, params } = assetFilterBasedOnNumber(
          req,
          "thing_power_factor"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.lifetime_runhour) {
        const { query, params } = assetFilterBasedOnNumber(
          req,
          "lifetime_runhour"
        );
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.dg_phase) {
        const { query, params } = this.assetFilterBasedOnText(req, "dg_phase");
        thingsFilterQuery += query;
        thingFilterParams.push(...params);
      }
    }

    thingsFilterQuery += ")";
    tasksQuery += thingsFilterQuery;
    summaryQuery += thingsFilterQuery;
    countsQuery += thingsFilterQuery;
    thingFilterParams.push(tripFromTime, tripTillTime);

    if (
      req.query.peak_load ||
      req.query.calculated_energy ||
      req.query.calculated_mains_energy ||
      req.query.fuel_consumption ||
      req.query.load_percentage ||
      req.query.calculated_runhour ||
      req.query.fuel_filled ||
      req.query.fuel_theft
      // req.query.assigned_to ||
      // req.query.order_purpose
    ) {
      endQuery += " AND 1";
      if (req.query.peak_load) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "peak_load"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.calculated_energy) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "calculated_energy"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.calculated_mains_energy) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "calculated_mains_energy"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.fuel_consumption) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "fuel_consumption"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.load_percentage) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "load_percentage"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.calculated_runhour) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "calculated_runhour"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.fuel_filled) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "fuel_filled"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      if (req.query.fuel_theft) {
        const { query, params } = tripFilterBasedOnNumber(
          req,
          "fuel_theft"
        );
        endQuery += query;
        thingFilterParams.push(...params);
      }
      // if (req.query.assigned_to) {
      // 	endQuery += " AND thing_rental_orders.tro_assigned_to = ?";
      // 	thingFilterParams.push(parseInt(req.query.assigned_to));
      // }
    }

    // if (req.query.order_purpose) {
    // 	const order_purpose_mapping = {
    // 		in_transit: "IS NULL",
    // 		test_drive: "17",
    // 		internal_transfer: "16"
    // 	};
    // 	if (req.query.order_purpose === "in_transit") {
    // 		endQuery += " AND JSON_VALUE(tasks.tsk_tags, '$') IS NULL";
    // 	} else if (
    // 		["test_drive", "internal_transfer"].includes(req.query.order_purpose)
    // 	) {
    // 		endQuery += ` AND JSON_CONTAINS(tasks.tsk_tags, '${
    // 			order_purpose_mapping[req.query.order_purpose]
    // 		}') = 1`;
    // 	}
    // }

    if (req.query.tags) {
      const tagFilter = req.query.tags.split("_");
      const filterData = super.getValidJSON(tagFilter[1]);
      if (tagFilter[0].startsWith("contains") && filterData.length) {
        endQuery += " AND CASE WHEN JSON_VALID(tasks.tsk_tags) THEN (0";
        for (let i = 0; i < filterData.length; i++) {
          const element = mysql.escape(filterData[i]);
          endQuery += ` OR JSON_CONTAINS(tasks.tsk_tags, '${element}') = 1`;
        }
        endQuery += ") ELSE 0 END";
      } else if (tagFilter[0].startsWith("empty")) {
        endQuery +=
          " AND IF(JSON_VALUE(tasks.tsk_tags, '$') IS NULL OR JSON_VALUE(tasks.tsk_tags, '$') = '[]', 1, 0)";
      }
    }
    let filterOutTags = "";
    if (req.query.fuel_entries !== "true") {
      filterOutTags += " AND NOT JSON_CONTAINS(tsk_tags, '26')";
    }
    if (req.query.offline_trips !== "true") {
      filterOutTags += " AND NOT JSON_CONTAINS(tsk_tags, '32')";
    }
    if (filterOutTags) {
      endQuery +=
        " AND (JSON_VALUE(tsk_tags, '$') IS NULL OR JSON_VALUE(tsk_tags, '$') = '[]' OR (JSON_VALID(tsk_tags) = 1";
      endQuery += filterOutTags + "))";
    }
    // this condition was added for datomsX only to show the tags for internal analysis with all trips of customer / partner
    // while for customer / partner only their trips will be shown
    if (clientId !== 1) {
      endQuery +=
        " AND NOT JSON_CONTAINS(tasks.tsk_tags, '14') AND NOT JSON_CONTAINS(tasks.tsk_tags, '15')";
    }

    tasksQuery += endQuery;
    summaryQuery += endQuery;
    countsQuery += endQuery;
    summaryQuery +=
      " AND NOT JSON_CONTAINS(tasks.tsk_tags, '26') AND NOT JSON_CONTAINS(tasks.tsk_tags, '32')";
    const tillSummaryParams = [...thingFilterParams];
    const countsQueryParams = [...thingFilterParams];

    let graphDataQuery = "";
    const graph_data_parameters = [];
    if (req.query.trip_graph === "true") {
      // find the timezone of the client
      const clientTimeZoneQuery =
        "SELECT * FROM client_end_point_tbl WHERE clep_id = ?";
      const details = await super.queryDb(clientTimeZoneQuery, [clientId]);
      const preferences =
        super.getValidJSON(details).timezone || "Asia/Calcutta";
      if (req.query.category_id === "18") {
        graphDataQuery =
          "SELECT DATE(CONVERT_TZ(FROM_UNIXTIME(tasks.tsk_actual_start_time), 'Europe/London', ?)) as dayWise ,SUM(g_td_calculated_runhour_sum) as total_runhour, SUM(g_td_fuel_consumption_sum)as fuel_consumed";
      } else if (req.query.category_id === "67") {
        graphDataQuery =
          "SELECT DATE(CONVERT_TZ(FROM_UNIXTIME(tasks.tsk_actual_start_time), 'Europe/London', ?)) as dayWise ,SUM(g_td_distance_travelled_sum) as distance_travelled, SUM(g_td_fuel_consumption_sum) as fuel_consumed";
      } else if (req.query.category_id === "76") {
        graphDataQuery =
          "SELECT DATE(CONVERT_TZ(FROM_UNIXTIME(tasks.tsk_actual_start_time), 'Europe/London', ?)) as dayWise ,SUM(g_td_distance_travelled_sum) as distance_travelled";
      }
      graph_data_parameters.push(preferences);
      graphDataQuery += thingsFilterQuery + endQuery;
    }
    if (req.query.order_key) {
      tasksQuery += " ORDER BY";
      const order_key = req.query.order_key;
      if (
        order_key === "tsk_actual_start_time" ||
        order_key === "tsk_actual_end_time"
      ) {
        tasksQuery += ` ${order_key}`;
      } else {
        const [order_param, order_sub_param] = order_key.split(",");
        tasksQuery += ` g_td_${order_param}_${order_sub_param}`;
      }
    } else {
      tasksQuery += " ORDER BY tsk_actual_start_time";
    }

    if (req.query.order_by === "asc") {
      tasksQuery += " ASC";
    } else {
      tasksQuery += " DESC";
    }

    // implement pagination
    let resultsPerPage = parseInt(req.query.results_per_page);
    let page_no = parseInt(req.query.page_no);

    if (isNaN(resultsPerPage)) {
      resultsPerPage = 25;
    }
    if (resultsPerPage > 1000) {
      resultsPerPage = 1000;
    }
    if (isNaN(page_no)) {
      page_no = 1;
    }
    tasksQuery += " LIMIT ? OFFSET ?";
    thingFilterParams.push(resultsPerPage, resultsPerPage * (page_no - 1));

    let final_query = summaryQuery + ";" + tasksQuery;
    const final_params = [...tillSummaryParams, ...thingFilterParams];
    if (req.query.trip_graph === "true") {
      final_query += ";" + graphDataQuery + " GROUP BY daywise";
      final_params.push(...graph_data_parameters, ...tillSummaryParams);
    }

    final_query += ";" + countsQuery;
    final_params.push(...countsQueryParams);

    const taskThingAssociationResults = await super.queryDb(
      final_query,
      final_params
    );

    const missions = [];
    for (const mission in taskThingAssociationResults[1]) {
      const filtered_aggregate_data = _.pickBy(
        super.getValidJSON(taskThingAssociationResults[1][mission].tsk_data)
          ?.aggregate_data,
        (value, key) => {
          return aggregationParameters.includes(key);
        }
      );
      const allTags = super.getValidJSON(
        taskThingAssociationResults[1][mission].tsk_tags,
        []
      );
      // const order_purpose = super.getValidJSON(
      // 	taskThingAssociationResults[1][mission]?.tsk_tags,
      // 	[]
      // )[0];
      missions.push({
        Id: taskThingAssociationResults[1][mission].tsk_id,
        Name: taskThingAssociationResults[1][mission].tsk_name,
        Status: taskThingAssociationResults[1][mission].tsk_status,
        StartDate: moment
          .unix(taskThingAssociationResults[1][mission].tsk_actual_start_time)
          .toISOString(),
        EndDate: taskThingAssociationResults[1][mission].tsk_actual_end_time
          ? moment
              .unix(taskThingAssociationResults[1][mission].tsk_actual_end_time)
              .toISOString()
          : "NA",
        CreationDate: moment
          .unix(taskThingAssociationResults[1][mission].tsk_created_at)
          .toISOString(),
        Assignee: taskThingAssociationResults[1][mission].tsk_asginee_user,
        Devices: [taskThingAssociationResults[1][mission].thing_id],
        Details: {
          aggregate_data: filtered_aggregate_data,
        },
        tags: tagsOfCustomer
          .filter((x) => allTags.includes(x.tag_id))
          .map((x) => x.tag_id),
        // assigned_to: taskThingAssociationResults[1][mission]?.tro_assigned_to,
        // order_purpose:
        // 	order_purpose === 17
        // 		? "test_drive"
        // 		: order_purpose === 16
        // 		? "internal_transfer"
        // 		: "in_transit"
      });
    }

    const graph_data = [];
    if (req.query.trip_graph === "true") {
      for (let i = 0; i < taskThingAssociationResults[2].length; i++) {
        const element = taskThingAssociationResults[2][i];
        graph_data.push({
          time: super.getValidTimestampFromISOString(element.dayWise),
          runhour: element.total_runhour,
          fuel_consumed: element.fuel_consumed,
          distance_travelled: element.distance_travelled,
        });
      }
    }

    const SummaryData = {};
    for (const param in summaryParameters) {
      if (summaryParameters[param] === "fuel_cons_per_hr") {
        const fuel_cons_per_hr =
          parseFloat(taskThingAssociationResults[0][0].total_fuel_consumed) /
          parseFloat(taskThingAssociationResults[0][0].total_runhour);
        if (!isFinite(fuel_cons_per_hr)) {
          SummaryData.fuel_cons_per_hr = "-";
        } else {
          SummaryData.fuel_cons_per_hr = fuel_cons_per_hr * 3600;
        }
      } else if (summaryParameters[param] === "energy_gen_per_litre") {
        const energy_gen_per_litre =
          parseFloat(taskThingAssociationResults[0][0].total_energy) /
          parseFloat(taskThingAssociationResults[0][0].total_fuel_consumed);
        if (!isFinite(energy_gen_per_litre)) {
          SummaryData.energy_gen_per_litre = "-";
        } else {
          SummaryData.energy_gen_per_litre = energy_gen_per_litre;
        }
      } else if (summaryParameters[param] === "fuel_cons_per_kwh") {
        const fuel_cons_per_kwh =
          parseFloat(taskThingAssociationResults[0][0].total_fuel_consumed) /
          parseFloat(taskThingAssociationResults[0][0].total_energy);
        if (!isFinite(fuel_cons_per_kwh)) {
          SummaryData.fuel_cons_per_kwh = "-";
        } else {
          SummaryData.fuel_cons_per_kwh = fuel_cons_per_kwh;
        }
      } else if (summaryParameters[param] === "load_percentage") {
        const load_percentage =
          parseFloat(taskThingAssociationResults[0][0].load_percentage) /
          parseFloat(taskThingAssociationResults[0][0].total_runhour);
        if (!isFinite(load_percentage)) {
          SummaryData.load_percentage = "-";
        } else {
          SummaryData.load_percentage = load_percentage;
        }
      } else if (summaryParameters[param] === "avarage_speed") {
        const avarage_speed =
          parseFloat(taskThingAssociationResults[0][0].total_distance) /
          parseFloat(taskThingAssociationResults[0][0].total_runhour);
        if (!isFinite(avarage_speed)) {
          SummaryData.avarage_speed = "-";
        } else {
          SummaryData.avarage_speed = avarage_speed * 3600;
        }
      } else if (summaryParameters[param] === "avg_trip_distance") {
        const avg_trip_distance =
          parseFloat(taskThingAssociationResults[0][0].total_distance) /
          parseFloat(taskThingAssociationResults[0][0].totalMissions);
        if (!isFinite(avg_trip_distance)) {
          SummaryData.avg_trip_distance = "-";
        } else {
          SummaryData.avg_trip_distance = avg_trip_distance;
        }
      } else if (summaryParameters[param] === "total_trips") {
        const total_trips = parseInt(
          taskThingAssociationResults[0][0].totalMissions
        );
        SummaryData.total_trips = total_trips;
      } else {
        SummaryData[summaryParameters[param]] =
          taskThingAssociationResults[0][0][summaryParameters[param]];
      }
    }

    const totalCountsIndex = req.query.trip_graph === "true" ? 3 : 2;
    return res.status(200).json({
      Status: "Success",
      Missions: missions,
      trip_summary: SummaryData,
      total_mission_count:
        taskThingAssociationResults[totalCountsIndex][0].totalMissions,
      graph_data,
      tag_options: tagsOfCustomer,
    });
  } catch (error) {
    res.status(500).json({
      Status: "Failure",
      Message: "Sorry, something went wrong!",
    });
    console.log("Error => ", error);
  }
}

function assetFilterBasedOnNumber(req, category) {
  let query = "";
  const params = [];
  let searchForKeyInDB = "";
  if (category === "thing_kva") {
    searchForKeyInDB = "g_tcd_kva";
  } else if (category === "thing_tankCapacity") {
    searchForKeyInDB = "g_tcd_capacity";
  } else if (category === "thing_power_factor") {
    searchForKeyInDB = "g_tcd_power_factor";
  } else if (category === "lifetime_runhour") {
    searchForKeyInDB = "g_tcd_lifetime_runhour";
  }
  const data = req.query[category];
  if (data.startsWith("between_")) {
    const filter = data.split("_")[1].split(",");
    const filter_value1 = parseFloat(filter[0]);
    const filter_value2 = parseFloat(filter[1]);
    let min_value, max_value;
    if (filter_value2 >= filter_value1) {
      max_value = filter_value2;
      min_value = filter_value1;
    } else {
      max_value = filter_value1;
      min_value = filter_value2;
    }
    query += ` AND ?? BETWEEN ? AND ?`;
    params.push(searchForKeyInDB, parseFloat(min_value), parseFloat(max_value));
  } else if (data.startsWith("notEmpty")) {
    query += ` AND ?? IS NOT NULL AND  ?? != ""`;
    params.push(searchForKeyInDB, searchForKeyInDB);
  } else if (data.startsWith("empty")) {
    query += ` AND (?? IS NULL OR ?? = "")`;
    params.push(searchForKeyInDB, searchForKeyInDB);
  } else {
    let equation = data.split("_")[0];
    equation = this.allowedConditions.includes(equation) ? equation : "=";
    query += ` AND ?? ${equation} ?`;
    params.push(searchForKeyInDB, parseFloat(data.split("_")[1]));
  }
  return { query, params };
}

function tripFilterBasedOnNumber(req, category) {
  let query = "";
  const params = [];
  let searchForKeyInDB = "";
  if (category === "peak_load") {
    searchForKeyInDB = "tasks.g_td_load_percentage_max";
  } else if (category === "calculated_energy") {
    searchForKeyInDB += "tasks.g_td_calculated_energy_sum";
  } else if (category === "calculated_mains_energy") {
    searchForKeyInDB += "tasks.g_td_calculated_mains_energy_sum";
  } else if (category === "fuel_consumption") {
    searchForKeyInDB += "tasks.g_td_fuel_consumption_sum";
  } else if (category === "load_percentage") {
    searchForKeyInDB += "tasks.g_td_load_percentage_avg";
  } else if (category === "calculated_runhour") {
    searchForKeyInDB += "tasks.g_td_calculated_runhour_sum";
  } else if (category === "fuel_filled") {
    searchForKeyInDB += "tasks.g_td_fuel_filled_sum";
  } else if (category === "fuel_theft") {
    searchForKeyInDB += "tasks.g_td_fuel_theft_sum";
  }
  const data = req.query[category];
  if (data.startsWith("between_")) {
    // filter for between
    const filter = data.split("_")[1].split(",");
    const filter_value1 = parseFloat(filter[0]);
    const filter_value2 = parseFloat(filter[1]);
    let min_value, max_value;
    if (filter_value2 >= filter_value1) {
      max_value = filter_value2;
      min_value = filter_value1;
    } else {
      max_value = filter_value1;
      min_value = filter_value2;
    }
    if (category === "calculated_runhour") {
      query += ` AND ?? BETWEEN ? AND ?`;
      params.push(
        searchForKeyInDB,
        parseFloat(min_value * 3600),
        parseFloat(max_value * 3600).toFixed(3)
      );
    } else {
      query += ` AND ?? BETWEEN ? AND ?`;
      params.push(
        searchForKeyInDB,
        parseFloat(min_value),
        parseFloat(max_value).toFixed(3)
      );
    }
  } else if (data.startsWith("notEmpty")) {
    query += ` AND ?? IS NOT NULL AND  ?? != ""`;
    params.push(searchForKeyInDB, searchForKeyInDB);
  } else if (data.startsWith("empty")) {
    query += ` AND ?? IS NULL`;
    params.push(searchForKeyInDB);
  } else {
    let equation = data.split("_")[0];
    equation = this.allowedConditions.includes(equation) ? equation : "=";

    if (category === "calculated_runhour") {
      query += ` AND ?? ${equation} ?`;
      params.push(
        searchForKeyInDB,
        parseFloat(data.split("_")[1] * 3600).toFixed(3)
      );
    } else {
      query += ` AND ?? ${equation} ?`;
      params.push(searchForKeyInDB, parseFloat(data.split("_")[1]).toFixed(3));
    }
  }
  return { query, params };
}
