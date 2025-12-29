package com.career_miner.careerminer_api.controllers;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

@RestController
public class DataController {
    private static final Logger logger = LogManager.getLogger(DataController.class);

    public DataController() {
        logger.info("Initializing Data Controller");
    }

    @PostMapping("/data/job-information")
    ResponseEntity<String> createData(@RequestHeader String authorization, @RequestBody JsonNode data) {
        if (data == null || data.isEmpty()) {
            return ResponseEntity.badRequest().body("Bad Data");
        }
        
        logger.info(data.toString());

        return ResponseEntity.ok().body("Processed");
    }
}
