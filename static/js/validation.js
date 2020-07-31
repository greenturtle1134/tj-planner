function onUpdate() {
    grad = {
        "math": 0,
        "history": 0,
        "lang": 0,
        "lang2": 0,
        "pe": 0,
        "econ": 0,
        "rs1": 1, // RS1 starts out "yes", and gets set to "no" later
        "cs": 0
    }

    var ms_courses = new Set();

    // Add things from previous years
    let math_courses = parseInt($("#ms-math").val()); // ? Does Algebra 1 correspond to TJ Math 1? If it does, we'd have to change the value in the HTML
    for (var i = 0; i<math_courses; i++) {
        ms_courses.add(MATHS[i]+"");
    }
    let language = $("#ms-lang").val();
    if (language !== "none") {
        $("#ms-lang-level").prop("disabled", false);
        var level = parseInt($("#ms-lang-level").val());
        for(var i = 0; i<level; i++){
            ms_courses.add(LANGUAGE[language][i]+"");
        }
    }
    else{
        $("#ms-lang-level").prop("disabled", true);
        $("#ms-lang-level").val("0");
    }
    if ($("#ms-epf-yes").is(":checked")) {
        ms_courses.add(SELF_EPF);
    }

    state = {
        past: new Set(ms_courses),
        present: new Set(ms_courses),
        year: 0,
        grad: grad,
        index: 0,
        rs_time: 0, // This is actually 2 + the current year * 2, minus 1 if it was in summer
        languages: {}
    };

    // Check all the boxes
    for (state.year = 0; state.year < 4; state.year++) {
        state.index = 0;

        // Update the summer box
        preUpdate($("#" + getBoxId("s", state.year+1)), state);
        updateBox($("#" + getBoxId("s", state.year+1)), state);
        postUpdate($("#" + getBoxId("s", state.year+1)), state);

        // Add normal and online courses to present set
        for (state.index = 1; state.index <= 7; state.index++) {
            preUpdate($("#" + getBoxId(state.index, state.year+1)), state);
        }
        preUpdate($("#" + getBoxId("o", state.year+1)), state);

        // Update the ordinary boxes
        for (state.index = 1; state.index <= 7; state.index++) {
            updateBox($("#" + getBoxId(state.index, state.year+1)), state);
        }

        // Update the online box
        updateBox($("#" + getBoxId("o", state.year+1)), state);

        // In senior year, check labs
        if (state.year == 3) {
            for (var lab_id in labs) {
                let requirements = labs[lab_id].prereqs;
                let recommendations = labs[lab_id].recommended;
                let reqMet = checkTree(requirements, state.past, state.present, null);
                let recMet = checkTree(recommendations, state.past, state.present, null);
                var entry = $("#labs__"+lab_id);
                var status = entry.find(".labs__status");
                if (reqMet.length === 0) {
                    if(recMet.length === 0) {
                        entry.removeClass("table-success table-default");
                        entry.addClass("table-primary");
                        status.text("Recommended");
                    }
                    else{
                        entry.removeClass("table-primary table-default");
                        entry.addClass("table-success");
                        status.text("Qualified");
                    }
                }
                else {
                    entry.removeClass("table-primary table-success");
                    entry.addClass("table-default");
                    status.text("Unqualified");
                }
            }
        }

        // Add normal and online courses to set
        for (state.index = 1; state.index <= 7; state.index++) {
            postUpdate($("#" + getBoxId(state.index, state.year+1)), state);
        }
        postUpdate($("#" + getBoxId("o", state.year+1)), state);
    }

    // Was RS taken at all?
    if(state.rs_time === 0) {
        grad.rs1 = 0;
    }

    // Check conditions depending only on the final courses
    grad = checkSimpleConditions(state.past, grad);

    // Check language condition
    state.past.forEach(function(id) {
        let course = courses[id];
        if (course.category==="World Languages") {
            let language = languageFromName(course.short_name);
            if (language in state.languages) {
                state.languages[language] += 1;
            }
            else{
                state.languages[language] = 1;
            }
        }
    });
    let max = 0;
    for (language in state.languages) {
        max = Math.max(max, state.languages[language]);
    }
    grad.lang = max;

    // Now display it
    showGradState(grad);

    // Sort the labs
    sortLabs()
}

function preUpdate($box, state) {
    $box.children(".course:not(#lab_placeholder)").each(function (i) {
        state.present.add($(this).attr("data-course-credit"));
        state.present.add($(this).attr("data-course-id"));
    });
}

function postUpdate($box, state) {
    $box.children(".course:not(#lab_placeholder)").each(function (i) {
        state.past.add($(this).attr("data-course-credit"));
        state.past.add($(this).attr("data-course-id"));
    });
}

function updateBox($box, state) {
    $children = $box.children(".course:not(#lab_placeholder)");

    if ($children.length == 1) {
        updateElement($children[0].id, null, state);
    } else if ($children.length == 2) {
        updateElement($children[0].id, $children[1].getAttribute("data-course-id"), state);
        updateElement($children[1].id, $children[0].getAttribute("data-course-id"), state);
    }
}

function updateElement(id, other_sem, state) {
    // Find the course
    $course = $("#" + id);
    course = courses[$course.attr("data-course-id")];

    // Update requirements stuff
    if ((state.year < 2 || (state.year === 2 && state.index === 0)) && course.category === "Computer Science") {
        state.grad.cs += 1;
    }
    if (course.id == RS1 && state.rs_time === 0) {
        state.rs_time = state.year*2 + ((state.index === 0)?1:2);
    }
    else if (course.category === "Mathematics" && (state.rs_time === 0 || state.rs_time >= state.year*2 + ((state.index === 0)?1:2)) && other_sem != RS1) {
        state.grad.rs1 = 0;
    }

    // Update the status
    result = checkTree(course.prereqs, state.past, state.present, other_sem);
    if (result.length === 0) {
        if (!course.availability[state.year]) {
            updateStatus(id, ICONS.CONDITIONAL, `This course is not offered in ${state.year+9}th grade, but this isn't a hard rule.`);
        } else {
            updateStatus(id, ICONS.SUCCESS, "Prerequisites are met.");
        }
    } else if (course.skiptest) {
        updateStatus(id, ICONS.TEST, "This course can be taken if you pass the skip test.");
    } else if (course.approval) {
        updateStatus(id, ICONS.APPROVE, "This course can be taken with teacher approval.");
    } else {
        let set = new Set();
        for (var i in result) {
            for (var j in result[i]) {
                set.add(result[i][j]);
            }
        }
        updateStatus(id, ICONS.FAILURE, "Prerequisites not met:\n" + treeToString(result) + "\nClick to view prerequisites", reqFilter(set));
    }
}

function checkTree(tree, past, present, other_sem) {
    if (tree === undefined || tree.length === 0) {
        // No prerequisites? Let it go.
        return [];
    }
    var total_unmet = [];
    for (var i = 0; i < tree.length; i++) {
        // Check every set for matching
        let unmet = [];

        for (var j = 0; j < tree[i].length; j++) {
            let prereq = tree[i][j];
            let isCoreq = false;
            if (prereq.charAt(prereq.length-1) == 'C'){
                prereq = prereq.substring(0, prereq.length-1);
                isCoreq = true;
            }
            if (!(past.has(prereq) || prereq == other_sem || (present.has(prereq) && isCoreq))) {
                unmet.push(prereq);
            }
        }

        if (unmet.length > 0) {
            total_unmet.push(unmet);
        }
        else {
            return [];
        }
    }

    return total_unmet;
}

function updateStatus(target_id, icon, text, clickFilter = null) {
    $("#" + target_id).find("span").html("<abbr title=\"" + text + "\" style=\"color:" + icon[1] + ";\"><i class=\"" + icon[0] + "\"></i></abbr>");
    if (clickFilter) {
        $("#" + target_id).find("span").click(function () {
            filter(clickFilter);
        });
    }
}

function treeToString(x) {
    if (x.length == 0) {
        return "None";
    }

    result = [];
    for (i in x) {
        for (j in x[i]) {
            result.push(" - " + getCourseNameString(courses[x[i][j]]));
        }
        if (i < x.length - 1) {
            result.push("or");
        }
    }

    return result.join("\n");
}
