package com.aquatrack.aquatrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AquatrackApplication {

	public static void main(String[] args) {
		SpringApplication.run(AquatrackApplication.class, args);
	}

}
