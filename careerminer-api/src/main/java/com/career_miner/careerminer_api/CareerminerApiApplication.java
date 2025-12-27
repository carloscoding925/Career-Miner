package com.career_miner.careerminer_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class CareerminerApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(CareerminerApiApplication.class, args);
	}

}
