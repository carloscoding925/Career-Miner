package com.career_miner.careerminer_api.controllers;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.career_miner.careerminer_api.models.Companies;
import com.career_miner.careerminer_api.models.ScrapedData;
import com.career_miner.careerminer_api.repositories.DataRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
public class DataController {
    private static final Logger logger = LogManager.getLogger(DataController.class);
    private final ObjectMapper objectMapper;

    private final DataRepository dataRepository;

    public DataController(ObjectMapper objectMapper, DataRepository dataRepository) {
        logger.info("Initializing Data Controller");

        this.objectMapper = objectMapper;
        this.dataRepository = dataRepository;
    }

    @PostMapping("/data/job-information/post")
    ResponseEntity<String> createData(@RequestHeader String authorization, @RequestBody ScrapedData data) {
        logger.info("Storing Data");

        if (data == null) {
            return ResponseEntity.badRequest().body("Bad Data");
        }

        try {
            Companies company = Companies.fromText(data.companyName());
            if (company == null) {
                return ResponseEntity.badRequest().body("Invalid Company Name In Data");
            }

            String jsonData = this.objectMapper.writeValueAsString(data);

            boolean result = this.dataRepository.upsertScrapedData(company, jsonData);

            if (!result) {
                return ResponseEntity.internalServerError().body("Database Error");
            }

            logger.info("Successfully Inserted Data");
            return ResponseEntity.ok().body("Processed");
        } catch (Exception ex) {
            logger.error("Caught Exception: " + ex);
            return ResponseEntity.internalServerError().body("Error");
        }
    }

    @GetMapping("/data/job-information/get")
    ResponseEntity<List<ScrapedData>> fetchAllData(@RequestHeader String authorization) {
        logger.info("Fetching All Company Data");

        try {
            

            return ResponseEntity.ok().build();
        } catch (Exception ex) {
            logger.error("Caught Exception: " + ex);
            return ResponseEntity.internalServerError().build();
        }
    }
}
