package com.career_miner.careerminer_api.controllers;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class JobDataController {
    private static final Logger logger = LogManager.getLogger(JobDataController.class);

    public JobDataController() {

    }

    @PostMapping
    ResponseEntity<String> createData() {
        return ResponseEntity.ok("Ok");
    }
}
